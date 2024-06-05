---
title: "Upping the Ante: Detecting In-Memory Threats with Kernel Call Stacks"
slug: "upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks"
date: "2023-05-31"
description: "We aim to out-innovate adversaries and maintain protections against the cutting edge of attacker tradecraft. With Elastic Security 8.8, we added new kernel call stack based detections which provide us with improved efficacy against in-memory threats."
author:
  - slug: joe-desimone
  - slug: samir-bousseaden
  - slug: gabriel-landau
image: "blog-thumb-coin-stacks.jpg"
category:
  - slug: security-research
---

## Intro

Elastic Security for endpoint, with its roots in Endgame, has long led the industry for in-memory threat detection. We [pioneered](https://www.elastic.co/security-labs/hunting-memory) and patented many detection technologies such as kernel [thread start](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/20170329973) preventions, call stack [anomaly hunting](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11151247), and [module stomping](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11151251) discovery. However, adversaries continue to innovate and evade detections. For example, in response to our improved [memory signature](https://www.elastic.co/blog/detecting-cobalt-strike-with-memory-signatures) protection, adversaries developed a flurry of new [sleep based](https://www.cobaltstrike.com/blog/cobalt-strike-and-yara-can-i-have-your-signature/) evasions. We aim to out-innovate adversaries and maintain protections against the cutting edge of attacker tradecraft. With Elastic Security 8.8, we added new kernel call stack based detections which provide us with improved efficacy against in-memory threats.

Before we get started, it's important to know what call stacks are and why they’re valuable for detection engineering. A [call stack](https://en.wikipedia.org/wiki/Call_stack) is the ordered sequence of functions that are executed to achieve a behavior of a program. It shows in detail which functions (and their associated modules) were executed to lead to a behavior like a new file or process being created. Knowing a behavior’s call stack, we can build detections with detailed contextual information about what a program is doing and how it’s doing it.

## Deep Visibility

The new call stack based detection capability leverages our existing deep in-line kernel visibility for the most common system behaviors (process, file, registry, library, etc). With each event, we capture the call stack for the activity. This is later enriched with module information, symbols, and evidence of suspicious activity. This gives us [procmon](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon)-like visibility in real-time, powering advanced preventions for in-memory tradecraft.

Process creation call stack fields : ![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image12.jpg)

File, registry and library call stack fields: ![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image8.jpg)

## New Rules

Additional visibility wouldn’t raise the bar unless we could pair it with tuned, high confidence preventions. In 8.8, behavior protection comes out of the box with 30+ rules to provide us with high efficacy against cutting edge attacker techniques such as: - Direct syscalls - Callback-based evasion - Module Stomping - Library loading from unbacked region - Process created from unbacked region - Many more

Call stacks are a powerful data source that can be used to improve protection against non-memory-based threats as well. For example, the following EQL queries look for the creation of a child process or an executable file extension from an Office process with a call stack containing `VBE7.dll` (a strong sign of the presence of a macro-enabled document). This increases the signal and coverage of the rule logic while reducing the necessary tuning efforts compared to just process or file creation events with no call stack information:

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image29.jpg)

Below are some examples of matches where Macro-enabled malicious Excel and Word documents spawning a child process where the call stack refers to `vbe7.dll` :

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image9.jpg)

Here, we can see a malicious XLL file opened via Excel spawning a legitimate `browser\_broker.exe` to inject into. The parent call stack indicates that the process creation call is coming from the `[xlAutoOpen](https://learn.microsoft.com/en-us/office/client-developer/excel/xlautoopen)` function:

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image11.jpg)

The same enrichment is also valuable in library load and registry events. Below is an example of loading the Microsoft Common Language Runtime `CLR.DLL` module from a suspicious call stack (unbacked memory region with RWX permissions) using the [Sliver execute-assembly](https://github.com/BishopFox/sliver/wiki/Using-3rd-party-tools) command to load external .NET assemblies:

```
library where dll.name : "clr.dll" and
process.thread.Ext.call_stack_summary : "*mscoreei.dll|Unbacked*"
```

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image4.jpg)

Hunting for suspicious modification of certain registry keys such as the Run key for persistence tends to be noisy and very common in legit software but if we add the call stack signal to the logic, the suspicion level is significantly increased :

```
registry where 
 registry.path : "H*\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\*"
// the creating thread's stack contains frames pointing outside any known executable image
 and process.thread.Ext.call_stack_contains_unbacked == true
```

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image2.jpg)

Another “fun” example is the use of the call stack information to detect rogue instances of core system processes that normally have very specific functionality. By signaturing their normal call stacks, we can easily identify outliers. For example, `WerFault.exe` and `wermgr.exe` are among the most attractive targets for masquerading:

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image30.jpg)

Examples of matches:

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image9.jpg)

Apart from the use of call stack data for finding suspicious behaviors, it’s also useful when it comes to excluding false positives from behavior detections in a more granular way. This also helps reduce evasion opportunities.

A good example is a detection rule looking for unusual Microsoft Office child processes. This rule is used to [exclude](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_microsoft_office_fetching_remote_content.toml#L26) `splwow64.exe` , which can be legitimately spawned by printing activity. Excluding it by `process.executable` creates an evasion opportunity via process hollowing or injection, which can make the process tree look normal. We can now mitigate this evasion by requiring such process creations to come from `winspool.drv!OpenPrinter` :

```
process where event.action == "start" and
  process.parent.name : ("WINWORD.EXE", "EXCEL.EXE", "POWERPNT.EXE", "MSACCESS.EXE", "mspub.exe", "fltldr.exe", "visio.exe") and
// excluding splwow64.exe only if it’s parent callstack is coming from winspool.drv module  
not (process.executable : "?:\\Windows\\splwow64.exe" and``_arraysearch(process.parent.thread.Ext.call_stack, $entry, $entry.symbol_info: ("?:\\Windows\\System32\\winspool.drv!OpenPrinter*", "?:\\Windows\\SysWOW64\\winspool.drv!OpenPrinter*")))
```

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image3.jpg)

To reduce event volumes, call stack information is collected on the endpoint and processed for detections but not always streamed in events. To always include call stacks in streamed events an advanced option is available in Endpoint policy:

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image7.jpg)

## C2 Coverage

Elastic Endpoint makes quick work detecting some of the top C2 frameworks active today. See below for a screenshot detecting Nighthawk, BruteRatel, CobaltStrike, and ATP41’s [StealthVector](https://www.trendmicro.com/vinfo/gb/security/news/cybercrime-and-digital-threats/earth-baku-returns).

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image5.jpg)

![](/assets/images/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks/image10.jpg)

## Conclusion

While this capability gives us a lead over the cutting edge of in-memory tradecraft today, attackers will no doubt develop [new innovations](https://labs.withsecure.com/publications/spoofing-call-stacks-to-confuse-edrs) in attempts to evade it. That’s why we are already hard at work to deliver the next set of leading in-memory detections. Stay tuned!

## Resources

Rules released with 8.8: 
- [Execution from a Macro Enabled Office Document](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_execution_from_a_macro_enabled_office_document.toml) 
- [Suspicious Macro Execution via Windows Scripts](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_suspicious_macro_execution_via_windows_scripts.toml) 
- [Suspicious File Dropped by a Macro Enabled Document](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_suspicious_file_dropped_by_a_macro_enabled_document.toml) 
- [Shortcut File Modification via Macro Enabled Document](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_shortcut_file_modification_via_macro_enabled_document.toml) 
- [DLL Loaded from a Macro Enabled Document](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_dll_loaded_from_a_macro_enabled_document.toml) 
- [Process Creation via Microsoft Office Add-Ins](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_process_creation_via_microsoft_office_add_ins.toml) 
- [Registry or File Modification from Suspicious Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/persistence_registry_or_file_modification_from_suspicious_memory.toml) 
- [Access to Browser Credentials from Suspicious Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/credential_access_access_to_browser_credentials_from_suspicious_memory.toml) 
- [Potential NTDLL Memory Unhooking](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_ntdll_memory_unhooking.toml) 
- [Microsoft Common Language Runtime Loaded from Suspicious Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_microsoft_common_language_runtime_loaded_from_suspicious_memory.toml) 
- [Common Language Runtime Loaded via an Unsigned Module](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_common_language_runtime_loaded_via_an_unsigned_module.toml) 
- [Potential Masquerading as Windows Error Manager](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_masquerading_as_windows_error_manager.toml) 
- [Suspicious Image Load via LdrLoadDLL](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_image_load_via_ldrloaddll.toml) 
- [Library Loaded via a CallBack Function](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_library_loaded_via_a_callback_function.toml) 
- [Process Creation from Modified NTDLL](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_process_creation_from_modified_ntdll.toml) 
- [DLL Side Loading via a Copied Microsoft Executable](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_dll_side_loading_via_a_copied_microsoft_executable.toml) 
- [Potential Injection via the Console Window Class](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_injection_via_the_console_window_class.toml) 
- [Suspicious Unsigned DLL Loaded by a Trusted Process](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_unsigned_dll_loaded_by_a_trusted_process.toml) 
- [Process Started via Remote Thread](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_process_stared_via_remote_thread.toml) 
- [Potential Injection via DotNET Debugging](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_injection_via_dotnet_debugging.toml) 
- [Potential Process Creation via ShellCode](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_process_creation_via_shellcode.toml) 
- [Module Stomping form a Copied Library](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_module_stomping_form_a_copied_library.toml) 
- [Process Creation from a Stomped Module](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_process_creation_from_a_stomped_module.toml) 
- [Parallel NTDLL Loaded from Unbacked Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_parallel_ntdll_loaded_from_unbacked_memory.toml) 
- [Potential Operation via Direct Syscall](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_operation_via_direct_syscall.toml) 
- [Potential Process Creation via Direct Syscall](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_process_creation_via_direct_syscall.toml) 
- [Process from Archive or Removable Media via Unbacked Code](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_process_from_archive_or_removable_media_via_unbacked_code.toml) 
- [Network Module Loaded from Suspicious Unbacked Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_network_module_loaded_from_suspicious_unbacked_memory.toml) 
- [Rundll32 or Regsvr32 Loaded a DLL from Unbacked Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_rundll32_or_regsvr32_loaded_a_dll_from_unbacked_memory.toml) 
- [Windows Console Execution from Unbacked Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_windows_console_execution_from_unbacked_memory.toml) 
- [Process Creation from Unbacked Memory via Unsigned Parent](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_process_creation_from_unbacked_memory_via_unsigned_parent.toml)
