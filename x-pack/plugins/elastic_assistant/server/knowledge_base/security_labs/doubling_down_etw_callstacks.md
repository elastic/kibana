---
title: "Doubling Down: Detecting In-Memory Threats with Kernel ETW Call Stacks"
slug: "doubling-down-etw-callstacks"
date: "2024-01-09"
description: "With Elastic Security 8.11, we added further kernel telemetry call stack-based detections to increase efficacy against in-memory threats."
author:
  - slug: john-uhlmann
  - slug: samir-bousseaden
image: "photo-edited-01.png"
category:
  - slug: security-research
tags:
  - slug: security-research
  - slug: security-operations
  - slug: detection-science
---

## Introduction

We were pleased to see that the [kernel call stack](https://www.elastic.co/security-labs/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks) capability we released in 8.8 was met with [extremely](https://x.com/Kostastsale/status/1664050735166930944) [positive](https://x.com/HackingLZ/status/1663897174806089728) [community feedback](https://twitter.com/bohops/status/1726251988244160776) - both from the offensive research teams attempting to evade us and the defensive teams triaging alerts faster due to the additional [context](https://www.elastic.co/security-labs/peeling-back-the-curtain-with-call-stacks).

But this was only the first step: We needed to arm defenders with even more visibility from the kernel - the most reliable mechanism to combat user-mode threats. With the introduction of Kernel Patch Protection in x64 Windows, Microsoft created a shared responsibility model where security vendors are now limited to only the kernel visibility and extension points that Microsoft provides. The most notable addition to this visibility is the [Microsoft-Windows-Threat-Intelligence Event Tracing for Windows](https://github.com/jdu2600/Windows10EtwEvents/blob/master/manifest/Microsoft-Windows-Threat-Intelligence.tsv)(ETW) provider.

Microsoft has identified a handful of highly security-relevant syscalls and provided security vendors with near real-time telemetry of those. While we would strongly prefer inline callbacks that allow synchronous blocking of malicious activity, Microsoft has implicitly not deemed this a necessary security use case yet. Currently, the only filtering mechanism afforded to security vendors for these syscalls is user-mode hooking - and that approach is [inherently](https://blogs.blackberry.com/en/2017/02/universal-unhooking-blinding-security-software) [fragile](https://www.cyberbit.com/endpoint-security/malware-mitigation-when-direct-system-calls-are-used/). At Elastic, we determined that a more robust detection approach based on kernel telemetry collected through ETW would provide greater security benefits than easily bypassed user-mode hooks. That said, kernel ETW does have some [systemic issues](https://labs.withsecure.com/publications/spoofing-call-stacks-to-confuse-edrs) that we have logged with Microsoft, along with suggested [mitigations](https://www.elastic.co/security-labs/finding-truth-in-the-shadows).

## Implementation

Endpoint telemetry is a careful balance between completeness and cost. Vendors don’t want to balloon your SIEM storage costs unnecessarily, but they also don't want you to miss the critical indicator of compromise. To reduce event volumes for these new API events, we fingerprint each event and only emit it if it is unique. This deduplication ensures a minimal impact on detection fidelity.

However, this approach proved insufficient in reducing API event volumes to manageable levels in all environments. Any further global reduction of event volumes we introduced would be a blindspot for our customers. Instead of potentially impairing detection visibility in this fashion, we determined that these highly verbose events would be processed for detections on the host but would not be streamed to the SIEM by default. This approach reduces storage costs for most of our users while also empowering any customer SOCs that want the full fidelity of those events to opt into streaming via an advanced option available in Endpoint policy and implement filtering tailored to their specific environments.

Currently, we propagate visibility into the following APIs -

 - `VirtualAlloc`
 - `VirtualProtect`
 - `MapViewOfFile`
 - `VirtualAllocEx`
 - `VirtualProtectEx`
 - `MapViewOfFile2`
 - `QueueUserAPC` [call stacks not always available due to ETW limitations]
 - `SetThreadContext` [call stacks planned for 8.12]
 - `WriteProcessMemory`
 - `ReadProcessMemory` (lsass) [planned for 8.12]

In addition to call stack information, our API events are also enriched with several [behaviors](https://github.com/elastic/endpoint-package/blob/main/custom_schemas/custom_api.yml):

| API event | Description |
|-----|-----|
| `cross-process` | The observed activity was between two processes. |
| `native_api` | A call was made directly to the undocumented Native API rather than the supported Win32 API. |
| `direct_syscall` | A syscall instruction originated outside of the Native API layer. |
| `proxy_call` | The call stack appears to show a proxied API call to masking the true caller. |
| `sensitive_api` | Executable non-image memory is unexpectedly calling a sensitive API. |
| `shellcode` | Suspicious executable non-image memory is calling a sensitive API. |
| `image-hooked` | An entry in the call stack appears to have been hooked. |
| `image_indirect_call` | An entry in the call stack was preceded by a call to a dynamically resolved function. |
| `image_rop` | An entry in the call stack was not preceded by a call instruction. |
| `image_rwx` | An entry in the call stack is writable. |
| `unbacked_rwx` | An entry in the call stack is non-image and writable. |
| `allocate_shellcode` | A region of non-image executable memory suspiciously allocated more executable memory. |
|`execute_fluctuation` | The PAGE_EXECUTE protection is unexpectedly fluctuating. |
| `write_fluctuation` | The PAGE_WRITE protection of executable memory is unexpectedly fluctuating. |
| `hook_api` | A change to the memory protection of a small executable image memory region was made. |
| `hollow_image` | A change to the memory protection of a large executable image memory region was made. |
| `hook_unbacked` | A change to the memory protection of a small executable non-image memory was made. |
| `hollow_unbacked` | A change to the memory protection of a large executable non-image memory was made. |
| `guarded_code` | Executable memory was unexpectedly marked as PAGE_GUARD.
| `hidden_code` | Executable memory was unexpectedly marked as PAGE_NOACCESS.
| `execute_shellcode` | A region of non-image executable memory was executed in an unexpected fashion. |
| `hardware_breakpoint_set` | A hardware breakpoint was potentially set. |

## New Rules

In 8.11, Elastic Defend’s behavior protection comes with many new rules against various popular malware techniques, such as shellcode fluctuation, threadless injection, direct syscalls, indirect calls, and AMSI or ETW patching.  

These rules include:

### Windows API Call via Direct Syscall

Identifies the call of commonly abused Windows APIs to perform code injection and where the call stack is not starting with NTDLL: 

```
api where event.category == "intrusion_detection" and

    process.Ext.api.behaviors == "direct_syscall" and 

    process.Ext.api.name : ("VirtualAlloc*", "VirtualProtect*", 
                             "MapViewOfFile*", "WriteProcessMemory")
```

![Windows API Call via Direct Syscall rule logic](/assets/images/doubling-down-etw-callstacks/image1.png)

### VirtualProtect via Random Indirect Syscall

Identifies calls to the VirtualProtect API and where the call stack is not originating from its equivalent NT syscall NtProtectVirtualMemory:

```
api where 

 process.Ext.api.name : "VirtualProtect*" and 

 not _arraysearch(process.thread.Ext.call_stack, $entry, $entry.symbol_info: ("*ntdll.dll!NtProtectVirtualMemory*", "*ntdll.dll!ZwProtectVirtualMemory*")) 
```

![VirtualProtect via Random Indirect Syscall rule match examples](/assets/images/doubling-down-etw-callstacks/image5.png)

### Image Hollow from Unbacked Memory

```
api where process.Ext.api.behaviors == "hollow_image" and 

  process.Ext.api.name : "VirtualProtect*" and 

  process.Ext.api.summary : "*.dll*" and 

  process.Ext.api.parameters.size >= 10000 and process.executable != null and 

  process.thread.Ext.call_stack_summary : "*Unbacked*"
```

Below example of matches on `wwanmm.dll` module stomping to replace it’s memory content with a malicious payload: 

![Image Hollow from Unbacked Memory rule match examples](/assets/images/doubling-down-etw-callstacks/image2.png)

### AMSI and WLDP Memory Patching

Identifies attempts to modify the permissions or write to Microsoft Antimalware Scan Interface or the Windows Lock Down Policy related DLLs from memory to modify its behavior for evading malicious content checks: 

```
api where

 (
  (process.Ext.api.name : "VirtualProtect*" and 
    process.Ext.api.parameters.protection : "*W*") or

  process.Ext.api.name : "WriteProcessMemory*"
  ) and

 process.Ext.api.summary : ("* amsi.dll*", "* mpoav.dll*", "* wldp.dll*") 
```

![AMSI and WLDP Memory Patching rule match examples](/assets/images/doubling-down-etw-callstacks/image6.png)

### Evasion via Event Tracing for Windows Patching

Identifies attempts to patch the Microsoft Event Tracing for Windows via memory modification: 

```
api where process.Ext.api.name :  "WriteProcessMemory*" and 

process.Ext.api.summary : ("*ntdll.dll!Etw*", "*ntdll.dll!NtTrace*") and 

not process.executable : ("?:\\Windows\\System32\\lsass.exe", "\\Device\\HarddiskVolume*\\Windows\\System32\\lsass.exe")
```

![Evasion via Event Tracing for Windows Patching rule match examples](/assets/images/doubling-down-etw-callstacks/image4.png)

### Windows System Module Remote Hooking

Identifies attempts to write to a remote process memory to modify NTDLL or Kernelbase modules as a preparation step for stealthy code injection:

```
api where process.Ext.api.name : "WriteProcessMemory" and  

process.Ext.api.behaviors == "cross-process" and 

process.Ext.api.summary : ("*ntdll.dll*", "*kernelbase.dll*")
```

Below is an example of matches on [ThreadLessInject](https://github.com/CCob/ThreadlessInject), a new process injection technique that involves hooking an export function from a remote process to gain shellcode execution (avoiding the creation of a remote thread):

![ThreadlessInject example detecting via the Windows System Module Remote Hooking rule](/assets/images/doubling-down-etw-callstacks/image3.png)

## Conclusion

Until Microsoft provides vendors with kernel callbacks for security-relevant syscalls, Threat-Intelligence ETW will remain the most robust visibility into in-memory threats on Windows. At Elastic, we’re committed to putting that visibility to work for customers and optionally directly into their hands without any hidden filtering assumptions. 

[Stay tuned](https://www.elastic.co/guide/en/security/current/release-notes.html) for the call stack features in upcoming releases of Elastic Security. 

## Resources

### Rules released with 8.11:

 - [AMSI or WLDP Bypass via Memory Patching](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_amsi_or_wldp_bypass_via_memory_patching.toml)     
 - [Call Stack Spoofing via Synthetic Frames](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_call_stack_spoofing_via_synthetic_frames.toml)
 - [Evasion via Event Tracing for Windows Patching](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_evasion_via_event_tracing_for_windows_patching.toml)
 - [Memory Protection Modification of an Unsigned DLL](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_memory_protection_modification_of_an_unsigned_dll.toml)
 - [Network Activity from a Stomped Module](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_network_activity_from_a_stomped_module.toml)
 - [Potential Evasion via Invalid Code Signature](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_potential_evasion_via_invalid_code_signature.toml)
 - [Potential Injection via an Exception Handler](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_potential_injection_via_an_exception_handler.toml)
 - [Potential Injection via Asynchronous Procedure Call](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_potential_injection_via_asynchronous_procedure_call.toml)
 - [Potential Thread Call Stack Spoofing](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_potential_thread_call_stack_spoofing.toml)
 - [Remote Process Injection via Mapping](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_remote_process_injection_via_mapping.toml)
 - [Remote Process Manipulation by Suspicious Process](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_remote_process_manipulation_by_suspicious_process.toml)
 - [Remote Thread Context Manipulation](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_remote_thread_context_manipulation.toml)
 - [Suspicious Activity from a Control Panel Applet](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_activity_from_a_control_panel_applet.toml)
 - [Suspicious API Call from a Script Interpreter](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_api_call_from_a_script_interpreter.toml)
 - [Suspicious API from an Unsigned Service DLL](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/persistence_suspicious_api_from_an_unsigned_service_dll.toml)
 - [Suspicious Call Stack Trailing Bytes](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_call_stack_trailing_bytes.toml)
 - [Suspicious Executable Heap Allocation](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_executable_heap_allocation.toml)
 - [Suspicious Executable Memory Permission Modification](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_executable_memory_permission_modification.toml)
 - [Suspicious Memory Protection Fluctuation](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_memory_protection_fluctuation.toml)
 - [Suspicious Memory Write to a Remote Process](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_memory_write_to_a_remote_process.toml)
 - [Suspicious NTDLL Memory Write](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_ntdll_memory_write.toml) 
 - [Suspicious Null Terminated Call Stack](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_null_terminated_call_stack.toml)
 - [Suspicious Kernel32 Memory Protection](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_kernel32_memory_protection.toml)
 - [Suspicious Remote Memory Allocation](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_remote_memory_allocation.toml)
 - [Suspicious Windows API Call from Virtual Disk or USB](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_windows_api_call_from_virtual_disk_or_usb.toml)
 - [Suspicious Windows API Call via Direct Syscall](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_windows_api_call_via_direct_syscall.toml)
 - [Suspicious Windows API Call via ROP Gadgets](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_windows_api_call_via_rop_gadgets.toml)
 - [Suspicious Windows API Proxy Call](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_suspicious_windows_api_proxy_call.toml)
 - [VirtualProtect API Call from an Unsigned DLL](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_virtualprotect_api_call_from_an_unsigned_dll.toml)
 - [VirtualProtect Call via NtTestAlert](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_virtualprotect_call_via_nttestalert.toml)
 - [VirtualProtect via Indirect Random Syscall](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_virtualprotect_via_indirect_random_syscall.toml)
 - [VirtualProtect via ROP Gadgets](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_virtualprotect_via_rop_gadgets.toml)
 - [Windows API via a CallBack Function](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_windows_api_via_a_callback_function.toml) 
 - [Windows System Module Remote Hooking](https://github.com/elastic/protections-artifacts/blob/cb45629514acefc68a9d08111b3a76bc90e52238/behavior/rules/defense_evasion_windows_system_module_remote_hooking.toml)
