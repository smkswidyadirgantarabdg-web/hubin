(() => {
const C=window.HUBIN_CONFIG, $=s=>document.querySelector(s);
const state={user:null,page:"dashboard",cache:new Map(),loading:false};

const NAV=[
 {g:"Utama",i:[["dashboard","📊","Dashboard"]]},
 {g:"Prakerin / PKL",i:[["prakerin","🎓","Data Prakerin"],["monitoring","📝","Monitoring Daring"],["jurnal","📒","Jurnal Siswa"]]},
 {g:"Hubungan Industri",i:[["dudi","🏢","Dunia Industri"],["kunjungan","🚐","Kunjungan Industri"],["mou","🤝","Kerja Sama / MoU"]]},
 {g:"BKK & Alumni",i:[["bkk","💼","Bursa Kerja Khusus"],["tracer","🔎","Penelusuran Lulusan"]]},
 {g:"Sistem",i:[["pengguna","👥","Pengguna"],["log","🛡️","Log Aktivitas"]]}
];

function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2500)}
function saveSession(){localStorage.setItem(C.SESSION_KEY,JSON.stringify(state.user))}
function loadSession(){try{state.user=JSON.parse(localStorage.getItem(C.SESSION_KEY)||"null")}catch{}}
function logout(){state.user=null;localStorage.removeItem(C.SESSION_KEY);$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden")}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fmtDate(v){if(!v)return"-";const d=new Date(v);return isNaN(d) ? esc(v) : d.toLocaleDateString("id-ID")}
function api(action,payload={},useCache=false){
 if(!C.API_URL||C.API_URL.includes("PASTE_")) return Promise.reject(new Error("API_URL belum diisi."));
 const key=action+JSON.stringify(payload), hit=state.cache.get(key);
 if(useCache&&hit&&Date.now()-hit.t<C.CACHE_TTL_MS)return Promise.resolve(hit.data);
 return new Promise((resolve,reject)=>{
   const name="hubin_"+Date.now()+"_"+Math.random().toString(36).slice(2);
   const iframe=document.createElement("iframe");iframe.name=name;iframe.style.display="none";document.body.appendChild(iframe);
   const form=document.createElement("form");form.method="POST";form.action=C.API_URL;form.target=name;form.style.display="none";
   const inp=document.createElement("input");inp.name="payload";inp.value=JSON.stringify({action,token:state.user?.token||"",payload});form.appendChild(inp);document.body.appendChild(form);
   const timer=setTimeout(()=>{cleanup();reject(new Error("Server timeout"))},20000);
   function cleanup(){clearTimeout(timer);window.removeEventListener("message",onmsg);form.remove();iframe.remove()}
   function onmsg(e){if(e.data&&e.data.hubinName===name){cleanup();if(e.data.ok){state.cache.set(key,{t:Date.now(),data:e.data.data});resolve(e.data.data)}else reject(new Error(e.data.error||"Gagal"))}}
   window.addEventListener("message",onmsg);form.submit();
   setTimeout(()=>{try{iframe.contentWindow.postMessage({hubinPing:name},"*")}catch{}},300);
 });
}
function renderNav(){let h="";NAV.forEach(g=>{h+=`<div class="nav-group">${g.g}</div>`;g.i.forEach(([id,ic,n])=>h+=`<button class="nav-item ${state.page===id?"active":""}" data-page="${id}"><span>${ic}</span>${n}</button>`)});$("#nav").innerHTML=h;document.querySelectorAll(".nav-item").forEach(x=>x.onclick=()=>{state.page=x.dataset.page;$("#sidebar").classList.remove("open");renderNav();renderPage()})}
function showApp(){ $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#userName").textContent=state.user.name||state.user.username;$("#userRole").textContent=state.user.role||"";$("#userAvatar").textContent=(state.user.name||"A").slice(0,1).toUpperCase();renderNav();renderPage()}
function titleFor(p){const all=NAV.flatMap(g=>g.i);return all.find(x=>x[0]===p)?.[2]||"Dashboard"}
async function renderPage(){
 const title=titleFor(state.page);$("#pageTitle").textContent=title;$("#pageDesc").textContent="SMK Widya Dirgantara • Sistem Hubungan Industri";$("#content").innerHTML='<div class="loading">Memuat data…</div>';
 try{
  const fn=pages[state.page]||pages.dashboard; await fn();
 }catch(e){$("#content").innerHTML=`<div class="section"><b>Terjadi kesalahan</b><p>${esc(e.message)}</p></div>`}
}
const pages={
 dashboard:async()=>{const d=await api("dashboard",{},true);$("#content").innerHTML=`
 <div class="hero"><div><h1>Selamat datang, ${esc(state.user.name||"Pengguna")}</h1><p>Kelola Prakerin, DUDI, kunjungan, BKK dan tracer study dari satu pusat data.</p></div><div class="hero-icon">🏢</div></div>
 <div class="cards">${[
 ["Siswa Prakerin",d.prakerin||0],["Mitra DUDI",d.dudi||0],["Kunjungan",d.kunjungan||0],["Lulusan",d.lulusan||0]
 ].map(x=>`<div class="stat"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("")}</div>
 <div class="grid2"><div class="section"><div class="section-head"><h3>Aktivitas Terbaru</h3></div>${(d.recent||[]).map(x=>`<p><b>${esc(x.user)}</b> ${esc(x.action)}<br><small>${fmtDate(x.time)}</small></p>`).join("")||'<div class="empty">Belum ada aktivitas.</div>'}</div>
 <div class="section"><div class="section-head"><h3>Modul Sistem</h3></div><p>Prakerin & monitoring, DUDI & kerja sama, kunjungan industri, BKK, dan tracer study tersedia dalam satu sistem.</p></div></div>`},
 prakerin:()=>crudPage("prakerin","Data Prakerin",["Siswa","NIS","Kelas","DUDI","Pembimbing","Mulai","Selesai","Status"]),
 monitoring:()=>crudPage("monitoring","Monitoring Prakerin",["Tanggal","Siswa","Pembimbing","Status","Catatan"]),
 jurnal:()=>crudPage("jurnal","Jurnal Kegiatan Siswa",["Tanggal","Siswa","Kegiatan","Validasi"]),
 dudi:()=>crudPage("dudi","Dunia Industri / Mitra",["Nama Perusahaan","Bidang","PIC","Telepon","Email","Status"]),
 kunjungan:()=>crudPage("kunjungan","Kunjungan Industri",["Tanggal","Tujuan","Peserta","Penanggung Jawab","Status"]),
 mou:()=>crudPage("mou","Kerja Sama / MoU",["DUDI","Nomor","Tanggal Mulai","Tanggal Berakhir","Status"]),
 bkk:()=>crudPage("bkk","Bursa Kerja Khusus",["Perusahaan","Posisi","Kuota","Batas Daftar","Status"]),
 tracer:()=>crudPage("tracer","Penelusuran Lulusan",["Nama","NIS","Tahun Lulus","Status","Perusahaan / Kampus"]),
 pengguna:()=>crudPage("pengguna","Pengguna Sistem",["Username","Nama","Role","Status"]),
 log:()=>crudPage("log","Log Aktivitas",["Waktu","User","Aksi","Modul"])
};
async function crudPage(key,title,cols){
 const data=await api("list",{table:key},true);const rows=data?.rows||[];
 $("#content").innerHTML=`<div class="section"><div class="section-head"><h3>${title}</h3><div class="actions"><button class="btn primary" id="addBtn">＋ Tambah</button><button class="btn" id="refreshBtn">↻ Refresh</button></div></div>
 <div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}<th>Aksi</th></tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??"")}</td>`).join("")}<td><button class="btn" data-edit='${esc(JSON.stringify(r))}'>Edit</button></td></tr>`).join("")||`<tr><td colspan="${cols.length+1}" class="empty">Belum ada data.</td></tr>`}</tbody></table></div></div>`;
 $("#addBtn").onclick=()=>openForm(key,title,cols,{});
 $("#refreshBtn").onclick=()=>{state.cache.clear();renderPage()};
}
function openForm(key,title,cols,row){
 const fields=cols.filter(c=>!["Aksi","Waktu"].includes(c));$("#content").innerHTML=`<div class="section"><div class="section-head"><h3>${row._id?"Edit":"Tambah"} ${title}</h3><button class="btn" id="back">← Kembali</button></div>
 <form id="dataForm" class="form-grid">${fields.map((c,i)=>`<div class="form-group ${fields.length===1?"full":""}"><label>${c}</label><input name="${esc(c)}" value="${esc(row[c]||"")}"></div>`).join("")}<div class="form-group full"><button class="btn primary" type="submit">Simpan Data</button></div></form></div>`;
 $("#back").onclick=renderPage;$("#dataForm").onsubmit=async e=>{e.preventDefault();const obj=Object.fromEntries(new FormData(e.target).entries());if(row._id)obj._id=row._id;try{await api("save",{table:key,row:obj});toast("Data berhasil disimpan");state.cache.clear();await renderPage()}catch(err){toast(err.message)}};
}
$("#loginForm").onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{const r=await api("login",{username:$("#username").value.trim(),password:$("#password").value});state.user=r;saveSession();showApp();toast("Login berhasil")}catch(err){toast(err.message)}finally{btn.disabled=false}};
$("#togglePassword").onclick=()=>{$("#password").type=$("#password").type==="password"?"text":"password"};
$("#logoutBtn").onclick=logout;$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
loadSession();if(state.user)showApp();
})();