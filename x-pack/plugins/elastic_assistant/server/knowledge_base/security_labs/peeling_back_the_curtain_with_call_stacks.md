---
title: "Peeling back the curtain with call stacks"
slug: "peeling-back-the-curtain-with-call-stacks"
date: "2023-09-13"
description: "In this article, we'll show you how we contextualize rules and events, and how you can leverage call stacks to better understand any alerts you encounter in your environment."
author:
  - slug: samir-bousseaden
image: "photo-edited-10@2x.jpg"
category:
  - slug: security-operations
  - slug: security-research
  - slug: detection-science
tags:
  - detection engineering
  - threat hunting
  - threat detection
---

## Introduction
Elastic Defend provides over [550 rules](https://github.com/elastic/protections-artifacts/tree/main/behavior/rules) (and counting) to detect and stop malicious behavior in real time on endpoints. We recently [added kernel call stack enrichments](https://www.elastic.co/security-labs/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks) to provide additional context to events and alerts. Call stacks are a win-win-win for behavioral protections, simultaneously improving false positives, false negatives, and alert explainability. In this article, we'll show you how we achieve all three of these, and how you can leverage call stacks to better understand any alerts you encounter in your environment.

## What is a call stack?
When a thread running function A calls function B, the CPU automatically saves the current instruction’s address (within A) to a thread-specific region of memory called the stack. This saved pointer is known as the return address - it's where execution will resume once the B has finished its job. If B were to call a third function C, then a return address within B will also be saved to the stack. These return addresses can be retrieved through a process known as a [stack walk](https://learn.microsoft.com/en-us/windows/win32/debug/capturestackbacktrace), which reconstructs the sequence of function calls that led to the current thread state. Stack walks list return addresses in reverse-chronological order, so the most recent function is always at the top.

In Windows, when we double-click on **notepad.exe**, for example, the following series of functions are called: 

 - The green section is related to base thread initialization performed by the operating system and is usually identical across all operations (file, registry, process, library, etc.)
 - The red section is the user code; it is often composed of multiple modules and provides approximate details of how the process creation operation was reached
 - The blue section is the Win32 and Native API layer; this is operation-specific, including the last 2 to 3 intermediary Windows modules before forwarding the operation details for effective execution in kernel mode

The following screenshot depicts the call stack for this execution chain:

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image17.png)

Here is an example of file creation using **notepad.exe** where we can see a similar pattern: 

 - The blue part lists the last user mode intermediary Windows APIs before forwarding the create file operation to kernel mode drivers for effective execution
 - The red section includes functions from **user32.dll** and **notepad.exe**, which indicate that this file operation was likely initiated via GUI
 - The green part represents the initial thread initialization
 
 ![](/assets/images/peeling-back-the-curtain-with-call-stacks/image19.png)

## Events Explainability

Apart from using call stacks for finding known bad, like [unbacked memory regions](https://www.elastic.co/security-labs/hunting-memory) with RWX permissions that may be the remnants of prior code injection. Call stacks provide very low-level visibility that often reveals greater insights than logs can otherwise provide. 

As an example, while hunting for suspicious process executions started by **WmiPrvSe.exe** via WMI, you find this instance of **notepad.exe**:

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image21.png)

Reviewing the standard event log fields, you may expect that it was started using the [Win32_Process](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process) class using the **wmic.exe process call create notepad.exe** syntax. However, the event details describe a series of modules and functions: 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image12.png)

The blue section depicts the standard intermediary **CreateProcess** Windows APIs, while the red section highlights better information in that we can see that the DLL before the first call to **CreateProcessW** is **wbemcons.dll** and when inspecting its properties we can see that it’s related to [WMI Event Consumers](https://learn.microsoft.com/en-us/windows/win32/wmisdk/commandlineeventconsumer). We can conclude that this **notepad.exe** instance is likely related to a WMI Event Subscription. This will require specific incident response steps to mitigate the WMI persistence mechanism.

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image22.png)

Another great example is Windows scheduled tasks. When executed, they are spawned as children of the Schedule service, which runs within a **svchost.exe** host process. Modern Windows 11 machines may have 50 or more **svchost.exe** processes running.  Fortunately, the Schedule service has a specific process argument **-s Schedule** which differentiates it: 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image8.png)

In older Windows versions, the Scheduled Tasks service is a member of the Network Service group and executed as a component of the **netsvcs** shared **svchost.exe** instance. Not all children of this process are necessarily scheduled tasks in these older versions: 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image2.png)

Inspecting the call stack on both versions, we can see the module that is adjacent to the **CreateProcess** call is the same **ubpm.dll** (Unified Background Process Manager DLL) executing the exported function **ubpm.dll!UbpmOpenTriggerConsumer**:

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image4.png)

Using the following KQL query, we can hunt for task executions on both versions: 

```
event.action :"start" and 
process.parent.name :"svchost.exe" and process.parent.args : netsvcs and 
process.parent.thread.Ext.call_stack_summary : *ubpm.dll* 
```

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image18.png)

Another interesting example occurs when a user double-clicks a script file from a ZIP archive that was opened using Windows Explorer. Looking at the process tree, you will see that **explorer.exe** is the parent and the child is a script interpreter process like **wscript.exe** or **cmd.exe**. 

This process tree can be confused with a user double-clicking a script file from any location on the file system, which is not very suspicious. But if we inspect the call stack we can see that the parent stack is pointing to **zipfld.dll** (Zipped Folders Shell Extension): 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image20.png)

## Detection Examples 
Now that we have a better idea of how to use the call stack to better interpret events, let’s explore some advanced detection examples per event type.

### Process 

#### Suspicious Process Creation via Reflection
[Dirty Vanity](https://www.deepinstinct.com/blog/dirty-vanity-a-new-approach-to-code-injection-edr-bypass) is a recent code-injection technique that abuses process forking to execute shellcode within a copy of an existing process. When a process is forked, the OS makes a copy of an existing process, including its address space and any [inheritable](https://learn.microsoft.com/en-us/windows/win32/sysinfo/handle-inheritance) handles therein. 

When executed, Dirty Vanity will fork an instance of a targeted process (already running or a sacrificial one) and then inject into it. Using process creation notification [callbacks](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nc-ntddk-pcreate_process_notify_routine_ex) won’t log forked processes because the forked process initial thread isn’t executed. But in the case of this injection technique, the forked process will be injected and a thread will be started, which triggers the process start event log with the following call stack: 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image6.png)

We can see the call to **RtlCreateProcessReflection** and **RtlCloneUserProcess** to fork the process. Now we know that this is a forked process, and the next question is “Is this common in normal conditions?” While diagnostically this behavior appears to be common and alone, it is not a strong signal of something malicious. Checking further to see if the forked processes perform any network connections, loads DLLs, or spawns child processes revealed to be less common and made for good detections: 

```
// EQL detecting a forked process spawning a child process - very suspicious

process where event.action == "start" and

descendant of 
   [process where event.action == "start" and 
   _arraysearch(process.parent.thread.Ext.call_stack, $entry, 
   $entry.symbol_info: 
    ("*ntdll.dll!RtlCreateProcessReflection*", 
    "*ntdll.dll!RtlCloneUserProcess*"))] and

not (process.executable : 
      ("?:\\WINDOWS\\SysWOW64\\WerFault.exe", 
      "?:\\WINDOWS\\system32\\WerFault.exe") and
     process.parent.thread.Ext.call_stack_summary : 
      "*faultrep.dll|wersvc.dl*")
```

```
// EQL detecting a forked process loading a network DLL 
//  or performs a network connection - very suspicious

sequence by process.entity_id with maxspan=1m
 [process where event.action == "start" and
  _arraysearch(process.parent.thread.Ext.call_stack, 
  $entry, $entry.symbol_info: 
    ("*ntdll.dll!RtlCreateProcessReflection*", 
    "*ntdll.dll!RtlCloneUserProcess*"))]
 [any where
  (
   event.category : ("network", "dns") or 
   (event.category == "library" and 
    dll.name : ("ws2_32.dll", "winhttp.dll", "wininet.dll"))
  )]
```

Here’s an example of forking **explore.exe** and executing shellcode that spawns **cmd.exe** from the forked **explorer.exe** instance:

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image13.png)

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image14.png)

### Direct Syscall via Assembly Bytes
The second and final example for process events is process creation via direct syscall. This directly uses the syscall instruction instead of calling the **NtCreateProcess** API. Adversaries may use [this method](https://www.ired.team/offensive-security/defense-evasion/using-syscalls-directly-from-visual-studio-to-bypass-avs-edrs) to avoid security products that are reliant on usermode API hooking (which Elastic Defend is not):

```
process where event.action : "start" and 

// EQL detecting a call stack not ending with ntdll.dll 
not process.parent.thread.Ext.call_stack_summary : "ntdll.dll*" and 

/* last call in the call stack contains bytes that execute a syscall
 manually using assembly <mov r10,rcx, mov eax,ssn, syscall> */

_arraysearch(process.parent.thread.Ext.call_stack, $entry,
 ($entry.callsite_leading_bytes : ("*4c8bd1b8??????000f05", 
 "*4989cab8??????000f05", "*4c8bd10f05", "*4989ca0f05")))
```
 
This example matches when the final memory region in the call stack is unbacked and contains assembly bytes that end with the syscall instruction (**0F05**):

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image16.png)

## File

### Suspicious Microsoft Office Embedded Object
The following rule logic identifies suspicious file extensions written by a Microsoft Office process from an embedded OLE stream, frequently used by malicious documents to drop payloads for initial access.

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image7.png)

```
// EQL detecting file creation event with call stack indicating 
// OleSaveToStream call to save or load the embedded OLE object

file where event.action != "deletion" and 

process.name : ("winword.exe", "excel.exe", "powerpnt.exe") and

_arraysearch(process.thread.Ext.call_stack, $entry, $entry.symbol_info:
 ("*!OleSaveToStream*", "*!OleLoad*")) and
(
 file.extension : ("exe", "dll", "js", "vbs", "vbe", "jse", "url", 
 "chm", "bat", "mht", "hta", "htm", "search-ms") or

 /* PE & HelpFile */
 file.Ext.header_bytes : ("4d5a*", "49545346*")
 )
```

Example of matches : 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image9.png)

### Suspicious File Rename from Unbacked Memory
Certain ransomware may inject into signed processes before starting their encryption routine. File rename and modification events will appear to originate from a trusted process, potentially bypassing some heuristics that exclude signed processes as presumed false positives. The following KQL query looks for file rename of documents, from a signed binary and with a suspicious call stack: 

```
file where event.action : "rename" and 
  
process.code_signature.status : "trusted" and file.extension != null and 

file.Ext.original.name : ("*.jpg", "*.bmp", "*.png", "*.pdf", "*.doc", 
"*.docx", "*.xls", "*.xlsx", "*.ppt", "*.pptx") and

not file.extension : ("tmp", "~tmp", "diff", "gz", "download", "bak", 
"bck", "lnk", "part", "save", "url", "jpg",  "bmp", "png", "pdf", "doc", 
"docx", "xls", "xlsx", "ppt", "pptx") and 

process.thread.Ext.call_stack_summary :
("ntdll.dll|kernelbase.dll|Unbacked",
 "ntdll.dll|kernelbase.dll|kernel32.dll|Unbacked", 
 "ntdll.dll|kernelbase.dll|Unknown|kernel32.dll|ntdll.dll", 
 "ntdll.dll|kernelbase.dll|Unknown|kernel32.dll|ntdll.dll", 
 "ntdll.dll|kernelbase.dll|kernel32.dll|Unknown|kernel32.dll|ntdll.dll", 
 "ntdll.dll|kernelbase.dll|kernel32.dll|mscorlib.ni.dll|Unbacked", 
 "ntdll.dll|wow64.dll|wow64cpu.dll|wow64.dll|ntdll.dll|kernelbase.dll|
 Unbacked", "ntdll.dll|wow64.dll|wow64cpu.dll|wow64.dll|ntdll.dll|
 kernelbase.dll|Unbacked|kernel32.dll|ntdll.dll", 
 "ntdll.dll|Unbacked", "Unbacked", "Unknown")
 ```
 
 Here are some examples of matches where **explorer.exe** (Windows Explorer) is injected by the [KNIGHT/CYCLOPS](https://www.bleepingcomputer.com/news/security/knight-ransomware-distributed-in-fake-tripadvisor-complaint-emails/) ransomware: 
 
 ![](/assets/images/peeling-back-the-curtain-with-call-stacks/image30.png)

### Executable File Dropped by an Unsigned Service DLL
Certain types of malware maintain their presence by disguising themselves as Windows service DLLs. To be recognized and managed by the Service Control Manager, a service DLL must export a function named **ServiceMain**. The KQL query below helps identify instances where an executable file is created, and the call stack includes the **ServiceMain** function.

```
event.category : file and 
 file.Ext.header_bytes :4d5a* and process.name : svchost.exe and 
 process.thread.Ext.call_stack.symbol_info :*!ServiceMain*
```

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image3.png)

## Library

### Unsigned Print Monitor Driver Loaded
The following EQL query identifies the loading of an unsigned library by the print spooler service where the call stack indicates the load is coming from **SplAddMonitor**. Adversaries may use [port monitors](https://attack.mitre.org/techniques/T1547/010/) to run an adversary-supplied DLL during system boot for persistence or privilege escalation.

```
library where
process.executable : ("?:\\Windows\\System32\\spoolsv.exe", 
"?:\\Windows\\SysWOW64\\spoolsv.exe") and not dll.code_signature.status : 
"trusted" and _arraysearch(process.thread.Ext.call_stack, $entry, 
$entry.symbol_info: "*localspl.dll!SplAddMonitor*")
```

Example of match: 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image5.png)

### Potential Library Load via ROP Gadgets
This EQL rule identifies the loading of a library from unusual **win32u** or **ntdll** offsets. This may indicate an attempt to bypass API monitoring using Return Oriented Programming (ROP) assembly gadgets to execute a syscall instruction from a trusted module.

```
library where
// adversaries try to use ROP gadgets from ntdll.dll or win32u.dll 
// to construct a normal-looking call stack

process.thread.Ext.call_stack_summary : ("ntdll.dll|*", "win32u.dll|*") and 

// excluding normal Library Load APIs - LdrLoadDll and NtMapViewOfSection
not _arraysearch(process.thread.Ext.call_stack, $entry, 
 $entry.symbol_info: ("*ntdll.dll!Ldr*", 
 "*KernelBase.dll!LoadLibrary*", "*ntdll.dll!*MapViewOfSection*"))
```

This example matches when [AtomLdr](https://www.kitploit.com/2023/06/atomldr-dll-loader-with-advanced.html) loads a DLL using ROP gadgets from **win32u.dll** instead of using **ntdll**’s load library APIs (**LdrLoadDll** and **NtMapViewOfSection**).

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image1.png)

### Evasion via LdrpKernel32 Overwrite
The [LdrpKernel32(https://github.com/rbmm/LdrpKernel32DllName) evasion is an interesting technique to hijack the early execution of a process during the bootstrap phase by overwriting the bootstrap DLL name referenced in **ntdll.dll** memory– forcing the process to load a malicious DLL. 

```
library where 
 
// BaseThreadInitThunk must be exported by the rogue bootstrap DLL
 _arraysearch(process.thread.Ext.call_stack, $entry, $entry.symbol_info :
  "*!BaseThreadInitThunk*") and

// excluding kernel32 that exports normally exports BasethreadInitThunk
not _arraysearch(process.thread.Ext.call_stack, $entry, $entry.symbol_info
 ("?:\\Windows\\System32\\kernel32.dll!BaseThreadInitThunk*", 
 "?:\\Windows\\SysWOW64\\kernel32.dll!BaseThreadInitThunk*", 
 "?:\\Windows\\WinSxS\\*\\kernel32.dll!BaseThreadInitThunk*", 
 "?:\\Windows\\WinSxS\\Temp\\PendingDeletes\\*!BaseThreadInitThunk*", 
 "\\Device\\*\\Windows\\*\\kernel32.dll!BaseThreadInitThunk*"))
```

Example of match: 
![](/assets/images/peeling-back-the-curtain-with-call-stacks/image15.png)

## Suspicious Remote Registry Modification
Similar to the scheduled task example, the remote registry service is hosted in **svchost.exe**. We can use the call stack to detect registry modification by monitoring when the Remote Registry service points to an executable or script file. This may indicate an attempt to move laterally via remote configuration changes.

```
registry where 

event.action == "modification" and 

user.id : ("S-1-5-21*", "S-1-12-*") and 

 process.name : "svchost.exe" and 

// The regsvc.dll in call stack indicate that this is indeed the 
// svchost.exe instance hosting the Remote registry service

process.thread.Ext.call_stack_summary : "*regsvc.dll|rpcrt4.dll*" and

 (
  // suspicious registry values
  registry.data.strings : ("*:\\*\\*", "*.exe*", "*.dll*", "*rundll32*", 
  "*powershell*", "*http*", "* /c *", "*COMSPEC*", "\\\\*.*") or
  
  // suspicious keys like Services, Run key and COM
  registry.path :
         ("HKLM\\SYSTEM\\ControlSet*\\Services\\*\\ServiceDLL",
          "HKLM\\SYSTEM\\ControlSet*\\Services\\*\\ImagePath",
          "HKEY_USERS\\*Classes\\*\\InprocServer32\\",
          "HKEY_USERS\\*Classes\\*\\LocalServer32\\",
          "H*\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\*") or
  
  // potential attempt to remotely disable a service 
  (registry.value : "Start" and registry.data.strings : "4")
  )
```

This example matches when the Run key registry value is modified remotely via the Remote Registry service: 

![](/assets/images/peeling-back-the-curtain-with-call-stacks/image11.png)

## Conclusion
As we’ve demonstrated, call stacks are not only useful for finding known bad patterns, but also for reducing ambiguity in standard EDR events, and easing behavior interpretation. The examples we've provided here represent just a minor portion of the potential detection possibilities achievable by applying enhanced enrichment to the same dataset.
