---
title: "In-the-Wild Windows LPE 0-days: Insights & Detection Strategies"
slug: "itw-windows-lpe-0days-insights-and-detection-strategies"
date: "2024-03-29"
description: "This article will evaluate detection methods for Windows local privilege escalation techniques based on dynamic behaviors analysis using Elastic Defend features."
author:
  - slug: samir-bousseaden
image: "image18.jpg"
category:
  - slug: security-operations
tags:
  - slug: windows
---

Based on disclosures from [Microsoft](https://msrc.microsoft.com/update-guide/vulnerability), [Google](https://googleprojectzero.github.io/0days-in-the-wild/rca.html), [Kaspersky](https://securelist.com/windows-clfs-exploits-ransomware/111560/), [Checkpoint](https://research.checkpoint.com/2024/raspberry-robin-keeps-riding-the-wave-of-endless-1-days/), and other industry players, it has become apparent that in-the-wild Windows local privilege escalation (LPE) zero-days are increasingly prevalent and essential components in sophisticated cybercrime and APT arsenals. It is important for detection engineers to closely examine these publicly accessible samples and assess possible avenues for detection. 

This article will not delve into the root cause or specific details of the vulnerabilities; however, we do provide links to appropriate vulnerability research articles. We will evaluate the detection methods based on dynamic behaviors analysis using [Elastic Defend](https://docs.elastic.co/en/integrations/endpoint) features.

## Case 1 - Common Log File System

[The Common Log File System (CLFS)](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/introduction-to-the-common-log-file-system) is a general-purpose logging service that can be used by software clients that need high-performance event logging. The [Microsoft Security Update Guide](https://msrc.microsoft.com/update-guide/) reveals that more than 30 CLFS vulnerabilities have been patched since 2018, 5 of which were observed during 2023 in ransomware attacks. 2024 also started with a [vulnerability report](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2024-20653) targeting the same CLFS driver (submitted by several researchers).

You can find an excellent series of write-ups delving into the internals of CLFS exploits [here](https://securelist.com/windows-clfs-exploits-ransomware/111560/). 
One thing that those exploits have in common is that they leverage a few ```clfsw32.dll``` APIs (```CreateLogFile``` and ```AddLogContainer```) to create and manipulate BLF logs, allowing them to write or corrupt a kernel mode address. Combined with other exploitation primitives, this can lead to a successful elevation.

Based on the specifics of these vulnerabilities, a high-level detection can be designed to identify unusual processes. For example, a process running as low or medium integrity can create BLF files followed by unexpectedly performing a system integrity-level activity (spawning a system child process, API call, file, or registry manipulation with system privileges). 

The following EQL query can be used to correlate Elastic Defend file events where the call stack contains reference of the user mode APIs ```CreateLogFile``` or ```AddLogContainerSet```, specifically when running as normal user followed by the creation of child process running as SYSTEM:

```
sequence with maxspan=5m
 [file where event.action != "deletion" and not user.id : "S-1-5-18" and   user.id != null and 
  _arraysearch(process.thread.Ext.call_stack, $entry, 
               $entry.symbol_info: ("*clfsw32.dll!CreateLogFile*", "*clfsw32.dll!AddLogContainerSet*"))] by process.entity_id
 [process where event.action == "start" and user.id : "S-1-5-18"] by process.parent.entity_id
```

The following example is of matches on CVE-2022-24521 where ```cmd.exe``` is started as SYSTEM:

![CLFS LPE exploit detection](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image10.png)


The following EQL query uses similar logic to the previous one, but instead of spawning a child process, it looks for API, file, or registry activity with SYSTEM privileges following the BLF file event:

```
sequence by process.entity_id 
 [file where event.action != "deletion" and not user.id : "S-1-5-18" and user.id != null and 
  _arraysearch(process.thread.Ext.call_stack, $entry, $entry.symbol_info : ("*clfsw32.dll!CreateLogFile*", "*clfsw32.dll!AddLogContainerSet*"))]
 [any where event.category : ("file", "registry", "api") and user.id : "S-1-5-18"]
 until [process where event.action:"end"] 
```

The following screenshot matches the cleanup phase of artifacts after the CLFS exploit elevated permissions (file deletion with system privileges):

![CLFS LPE exploit detection](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image11.png)


In addition to the previous [two behavior detections](https://github.com/search?q=repo%3Aelastic%2Fprotections-artifacts%20CLFS&type=code), we can also leverage YARA to hunt for unsigned PE files that import the user mode APIs ```CreateLogFile``` or ```AddLogContainerSet``` and an atypical number of functions from ```clfsw32.dll``` (normal CLFS clients programs would import more functions from the same DLL):

```
import "pe" 

rule lpe_clfs_strings {
    strings:
     $s1 = "NtQuerySystemInformation"
     $s2 = "clfs.sys" nocase
    condition:
     uint16(0)==0x5a4d and (pe.imports("clfsw32.dll", "CreateLogFile") or pe.imports("clfsw32.dll", "AddLogContainer")) and all of ($s*)
}

rule lpe_clfs_unsigned {
    condition:
     uint16(0)==0x5a4d and pe.number_of_signatures == 0 and filesize <= 200KB and 
      (pe.imports("clfsw32.dll", "CreateLogFile") or pe.imports("clfsw32.dll", "AddLogContainer")) and 
      not (pe.imports("clfsw32.dll", "ReadLogRecord") or pe.imports("clfsw32.dll", "CreateLogMarshallingArea"))
}
```

Below is an example of a [VT match](https://www.virustotal.com/gui/file/afb715f9a6747b4ae74a7880b5a60eb236d205248b3a6689938e3b7ba6e703fa) using Elastic’s YARA rules for [CVE-2023-2825](https://msrc.microsoft.com/update-guide/en-US/advisory/CVE-2023-28252):

![YARA rule match for CVE-2023-2825](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image2.png)

YARA rule match for CVE-2023-2825 

## Case 2 - Windows DWM core library EoP

Desktop Window Manager (```dwm.exe```) has been the compositing window manager in Microsoft Windows since Windows Vista. This program enables hardware acceleration to render the Windows graphical user interface and has high privileges; however, users with low privileges can interact with the DWM process, which significantly increases the attack surface. 

Security researcher [Quan Jin](https://twitter.com/jq0904) reported an in-the-wild vulnerability exploit for [CVE-2023-36033](https://msrc.microsoft.com/update-guide/en-US/advisory/CVE-2023-36033), and a detailed [writeup](https://googleprojectzero.github.io/0days-in-the-wild/0day-RCAs/2023/CVE-2023-36033.html) explaining the exploit's stages was published later by Google Project Zero. 

Based on our understanding, a DWM Core Library (```dwmcore.dll```) vulnerability exploit will most likely trigger shellcode execution in the ```dwm.exe``` process while running with Window Manager\DWM user privilege. Note that this is high integrity but not yet SYSTEM.  

Detonating the ITW public sample on Elastic Defend indeed triggers a self-injection shellcode alert. Without prior knowledge and context, one may confuse it with a generic code injection alert or false positive since it’s a self-injection alert by a Microsoft trusted system binary with a normal parent process and no loaded malicious libraries. 

The following KQL hunt can be used to find similar shellcode alerts: 

```
event.code : "shellcode_thread" and process.name : "dwm.exe" and user.name : DWM*
```

![Shellcode detection alert for CVE-2023-36033](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image6.png)


Other than shellcode execution, we can also look for unusual activity in ```dwm.exe``` by baselining child processes and file activity. Below, we can see an example of ```dwm.exe``` spawning ```cmd.exe``` as a result of exploitation:

![DWM spawning cmd.exe due to LPE exploit](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image12.png)


Based on our telemetry visibility, ```dwm.exe``` rarely spawns legitimate child processes. The following [detection](https://github.com/elastic/protections-artifacts/blob/72fd8cad90189e9d145d22eb3d4fee2fe3d5902f/behavior/rules/privilege_escalation_unusual_desktop_window_manager_child_process.toml) can be used to find abnormal ones: 

```
process where event.action == "start" and
 process.parent.executable : "?:\\Windows\\system32\\dwm.exe" and user.id : ("S-1-5-90-0-*", "S-1-5-18") and process.executable : "?:\\*" and 
 not process.executable : ("?:\\Windows\\System32\\WerFault.exe", "?:\\Windows\\System32\\ISM.exe", "?:\\Windows\\system32\\dwm.exe")
```

![](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image8.png)

To further elevate privileges from the Window Manager\DWM user to SYSTEM, the shellcode drops a DLL to disk and places a JMP hook on the ```kernelbase!MapViewOfFile``` calls within the ```dwm.exe``` process. It then triggers a logoff by executing the ```shutdown /l``` command. 

The logoff action triggers the execution of the ```LogonUI.exe``` process, which runs as a SYSTEM user. The ```LogonUI.exe``` process will communicate with the Desktop Window Manager process similar to any desktop GUI process, which will marshal/unmarshal Direct Composition objects. 

The ```MapViewOfFile``` hook inside ```dwm.exe``` monitors the mapped heap content. It modifies it with another set of crafted gadgets utilized to execute a ```LoadLibraryA``` call of the dropped DLL, when the resource heap data is unmarshalled within the ```LogonUI.exe``` process. 

The two main detection points here occur when ```dwm.exe``` drops a PE file to disk and when ```LogonUI.exe``` loads a DLL, with the call stack pointing to ```dcomp.dll``` - an indicator of marshaling/unmarshaling Direct Composition objects. 

Below is a KQL query that looks for ```dwm.exe``` by dropping a PE file to disk in both file events and malware alerts:

```
(event.category :"file" or event.code :"malicious_file") and 

process.name :"dwm.exe" and user.id:S-1-5-90-0-* and 

(file.extension :(dll or exe) or file.Ext.header_bytes :4d5a*) 
```

![DWM dropping reflective DLL to disk post exploit execution](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image5.png)


Below is a [detection](https://github.com/elastic/endpoint-rules/blob/20833cbeaac4284ecf9818b44438bda4bc3cae18/rules/privilege_escalation_logonui_dcomp.toml) EQL query that looks for the LogonUI DLL load hijack: 

```
library where process.executable : "?:\\Windows\\System32\\LogonUI.exe" and 
 user.id : "S-1-5-18" and 
 not dll.code_signature.status : "trusted" and 
 process.thread.Ext.call_stack_summary : "*combase.dll|dcomp.dll*"
```

![LogonUI.exe loading the DLL dropped by dwm.exe](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image1.png)


## Case 3 - Windows Activation Context EoP

[CVE-2022-41073](https://googleprojectzero.github.io/0days-in-the-wild//0day-RCAs/2022/CVE-2022-41073.html) is another interesting in-the-wild vulnerability. The core vulnerability is that a user can remap the root drive (```C:\```) for privileged processes during impersonation. [This specific sample](https://www.virustotal.com/gui/file/e8a94466e64fb5f84eea5d8d1ba64054a61abf66fdf85ac160a95b204b7b19f3/details) tricks the ```printfilterpipelinesvc.exe``` process to load an arbitrary DLL by redirecting the ```C:\``` drive to ```C:\OneDriveRoot``` during the [Activation Context](https://learn.microsoft.com/en-us/windows/win32/sbscs/activation-contexts) generation in the client server runtime subsystem (CSRSS). It then masquerades as the ```C:\Windows\WinSxS``` directory and is not writable by unprivileged users.

From a behavioral perspective, it falls under the category of loading a DLL by a SYSTEM integrity process that was dropped by a low/medium integrity process. There is also a mark of masquerading as the legitimate Windows WinSxS folder.

The following EQL hunt can be used to find similar attempts to masquerade as trusted system folders for redirection: 

```
any where (event.category in ("file", "library") or event.code : "malicious_file") and 
(
  file.path : ("C:\\*\\Windows\\WinSxS\\*.dll", "C:\\*\\Windows\\system32\\*.dll", "C:\\*\\Windows\\syswow64\\*.dll", "C:\\*\\Windows\\assembly\\NativeImages*.dll") or 
 
  dll.path : ("C:\\*\\Windows\\WinSxS\\*.dll", "C:\\*\\Windows\\system32\\*.dll", "C:\\*\\Windows\\syswow64\\*.dll", "C:\\*\\Windows\\assembly\\NativeImages*.dll")
 )
```

![CVE-2022-41073 EoP attempt to Masquerade as trusted system folders](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image13.png)


This also matches on [this](https://github.com/elastic/protections-artifacts/blob/72fd8cad90189e9d145d22eb3d4fee2fe3d5902f/behavior/rules/privilege_escalation_untrusted_dll_loaded_by_a_system_windows_process.toml) generic endpoint detection, which looks for untrusted modules loaded by elevated system native processes:

![Alert - Untrusted DLL Loaded by a System Windows Process](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image14.png)


## Generic Behavior Detection

The examples provided above illustrate that each vulnerability possesses distinct characteristics. Exploitation methods vary depending on the flexibility of primitives, such as writing to an address, executing shellcode, loading an arbitrary DLL, or creating a file. Certain system components may harbor more vulnerabilities than others, warranting dedicated detection efforts (e.g., CLFS, win32k).

Nevertheless, these vulnerabilities' ultimate objective and impact remain consistent. This underscores the opportunity to devise more effective detection strategies.

Privilege escalation can manifest in various forms:
 - A low/medium integrity process spawning an elevated child process
 - A low/medium integrity process injecting code into an elevated process
 - A system integrity process unexpectedly loads an untrusted DLL
 - A system native process unexpectedly drops PE files
 - A low/medium integrity process dropping files to system-protected folders
  - A user-mode process writing to a kernel mode address

Leveraging Elastic Defend’s capabilities, we can design detections and hunt for each of the  possibilities above.

**Low/Medium integrity process spawning an elevated child process**:

```
sequence with maxspan=5m
 [process where event.action == "start" and
  process.Ext.token.integrity_level_name in ("medium", "low")] by process.entity_id
 [process where event.action == "start" and
  process.Ext.token.integrity_level_name == "system" and user.id : "S-1-5-18"] by process.parent.entity_id
```

Example of matches on a [sample](https://www.virustotal.com/gui/file/b17c0bdffa9086531e05677aad51252c6a883598109473fc2f4b4b8bfec8b6d3/) exploiting a vulnerable driver (Zemana `zam64.sys`) to spawn `cmd.exe` as SYSTEM: 

![Detection for unusual parent child process integrity levels](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image3.png)


**Low/medium integrity process injecting code into an elevated process**:

Here is an [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) query to look for rare cross-process API calls: 

```
from logs-endpoint.events.api*
| where process.Ext.token.integrity_level_name in ("medium", "low") and Target.process.Ext.token.integrity_level_name == "system" and
 process.Ext.api.name in ("WriteProcessMemory", "VirtualProtect", "VirtualAllocEx", "VirtualProtectEx", "QueueUserAPC", "MapViewOfFile", "MapViewOfFileEx")
| stats occurrences = count(*), agents = count_distinct(host.id) by process.Ext.api.name, process.executable, Target.process.executable
| where agents == 1 and occurrences <= 100
```

When we run this query, we get LPE exploits injecting into ```winlogon.exe``` post-elevation via token swapping: 

![Detection for cross-process injection from Medium IL to winlogon.exe running as SYSTEM](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image15.png)


**System integrity process unexpectedly loads an untrusted DLL**

Here’s an ES|QL query to look for rare unsigned DLLs that have been loaded by an elevated Microsoft binary: 

```
from logs-endpoint.events.library-*
| where host.os.family == "windows" and event.action == "load" and
  starts_with(process.code_signature.subject_name, "Microsoft") and        
  user.id in ("S-1-5-18", "S-1-5-19", "S-1-5-20") and 
  process.code_signature.status == "trusted" and 
  dll.Ext.relative_file_creation_time <= 500 and
  (dll.code_signature.exists == false or dll.code_signature.trusted == false) and   

  /* excluding noisy DLL paths */   
  not dll.path rlike """[C-F]:\\Windows\\(assembly|WinSxS|SoftwareDistribution|SystemTemp)\\.+\.dll""" and

 /* excluding noisy processes and potentially unrelated to exploits - svchost must be covered by a dedicated hunt to exclude service dlls and COM */
not process.name in ("rundll32.exe", "regsvr32.exe", "powershell.exe", "msiexec.exe", "svchost.exe", "w3wp.exe", "mscorsvw.exe", "OfficeClickToRun.exe", "SetupHost.exe", "UpData.exe", "DismHost.exe")

| stats occurrences = count(*), host_count = count_distinct(host.id) by dll.name, process.name
/* loaded once and the couple dll.name process.name are present in one agent across the fleet */
| where occurrences == 1 and host_count == 1
```

![LogonUI loading malicious DLL via dcomp unmarshalling](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image9.png)


**A system native process unexpectedly drops PE files**

The following ES|QL query can be used to hunt for instances of a privileged Microsoft signed binary that has a low count of executable file creation history and is limited to one agent across the fleet of monitored hosts: 

```
from logs-endpoint.events.file-*
| where  @timestamp > now() - 30 day
| where host.os.family == "windows" and event.category == "file" and event.action == "creation" and user.id in ("S-1-5-18", "S-1-5-19", "S-1-5-20", "S-1-5-90-0-*") and
 starts_with(file.Ext.header_bytes, "4d5a") and process.code_signature.status == "trusted" and
 starts_with(process.code_signature.subject_name, "Microsoft") and 
 process.executable rlike """[c-fC-F]:\\Windows\\(System32|SysWOW64)\\[a-zA-Z0-9_]+.exe""" and
 not process.name in ("drvinst.exe", "MpSigStub.exe", "cmd.exe")
| keep process.executable, host.id
| stats occurrences = count(*), agents = count_distinct(host.id) by process.executable
| where agents == 1 and occurrences == 1
```

![Unusual PE file creation by a SYSTEM process](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image4.png)


**User-mode process writing to a kernel mode address**

Corrupting [PreviousMode](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/previousmode) is a widely popular exploitation technique. Overwriting this one byte in the [KTHREAD](https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/ntos/ke/kthread/index.htm) structure bypasses kernel-mode checks inside syscalls such as ```NtReadVirtualMemory``` or ```NtWriteVirtualMemory```, allowing a user-mode attacker to read and write arbitrary kernel memory.

On x64, the virtual address space is divided into the user mode addresses ranging from ```0x00000000 00000000``` - ```0x0000FFFF FFFFFFFF``` and the kernel mode address ranging from ```0xFFFF0000 00000000``` - ```0xFFFFFFFF FFFFFFFF```. The following EQL query can be used to detect API `NtReadVirtualMemory` or ```NtReadVirtualMemory``` calls where the target address is a kernel mode one, which is an abnormal behavior:

```
api where process.pid != 4 and process.Ext.api.name : "WriteProcessMemory"
 and process.executable != null and 
   /*  kernel mode address range - decimal */
   process.Ext.api.parameters.address > 281474976710655
```
  
Here is an example of these [alerts](https://github.com/elastic/endpoint-rules/blob/20833cbeaac4284ecf9818b44438bda4bc3cae18/rules/privilege_escalation_api_kernel_address_space.toml) triggering on exploits leveraging this primitive: 

![Detection of PreviousMode abuse](/assets/images/itw-windows-lpe-0days-insights-and-detection-strategies/image7.png)


## Conclusion

Detecting elevation of privileges for specific vulnerabilities requires a deep understanding of the vulnerability and its exploitation methods, which is not common knowledge. Therefore, investing in generic behavioral detection mechanisms focusing on the exploit effect on the system and frequently used primitives like [KASLR bypass](https://github.com/waleedassar/RestrictedKernelLeaks), [token swapping](https://www.ired.team/miscellaneous-reversing-forensics/windows-kernel-internals/how-kernel-exploits-abuse-tokens-for-privilege-escalation), [PreviousMode abuse](https://research.nccgroup.com/2020/05/25/cve-2018-8611-exploiting-windows-ktm-part-5-5-vulnerability-detection-and-a-better-read-write-primitive/#previousmode-abuse), and others proves more effective. However, for highly targeted Windows system components such as CLFS and win32k, dedicated detections are always valuable - ideally a combination of behavior and YARA.

Despite the technical intricacies and the absence of logs for common primitives, the blue team should not disregard exploit and vulnerability research content; rather, they should endeavor to comprehend and apply it. Additionally, sharing via VirusTotal or similar in-the-wild LPE exploit samples with the defensive community will facilitate further the testing and enhancement of detection controls.

Additional detection rules for [exploitation for privilege escalation](https://attack.mitre.org/techniques/T1068/) can be accessed [here](https://github.com/search?q=repo%3Aelastic%2Fprotections-artifacts+%22T1068%22&type=code&p=1).

## References
 - https://i.blackhat.com/USA-22/Thursday/us-22-Jin-The-Journey-Of-Hunting-ITW-Windows-LPE-0day-wp.pdf
 - https://securelist.com/windows-clfs-exploits-ransomware/111560/
 - https://www.zscaler.com/blogs/security-research/technical-analysis-windows-clfs-zero-day-vulnerability-cve-2022-37969-part2-exploit-analysis
 - https://googleprojectzero.github.io/0days-in-the-wild/rca.html
 - https://conference.hitb.org/hitbsecconf2023ams/session/hunting-windows-desktop-window-manager-bugs/
 - https://research.checkpoint.com/2024/raspberry-robin-keeps-riding-the-wave-of-endless-1-days/








