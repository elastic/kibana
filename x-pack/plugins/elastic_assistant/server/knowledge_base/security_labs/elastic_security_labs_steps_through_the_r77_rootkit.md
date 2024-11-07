---
title: "Elastic Security Labs steps through the r77 rootkit"
slug: "elastic-security-labs-steps-through-the-r77-rootkit"
date: "2023-05-22"
subtitle: "Open source userland rootkit used to deploy the XMRIG crypto miner."
description: "Elastic Security Labs explores a campaign leveraging the r77 rootkit and has been observed deploying the XMRIG crypto miner. The research highlights the different modules of the rootkit and how they’re used to deploy additional malicious payloads."
author:
  - slug: salim-bitam
image: "photo-edited-06@2x.jpg"
category:
  - slug: malware-analysis
tags:
  - ref9597
  - crypto
  - xmrig
---

## Key takeaways

- r77 is a stealthy open source rootkit that is being used to deploy the XMRIG crypto miner
- r77 uses several modules as a way to successfully install and maintain persistence
- Campaign authors are leaning heavily on open source tools and scripts, possibly to abstract attribution or reduce development costs

## Preamble

Elastic Security Labs has uncovered a malicious crypto miner that had been deployed in several Asian countries. The campaign owners are using an open source userland rootkit, called r77.

r77’s primary purpose is to hide the presence of other software on a system by hooking important Windows APIs, making it an ideal tool for cybercriminals looking to carry out stealthy attacks. By leveraging the r77 rootkit, the authors of the malicious crypto miner were able to evade detection and continue their campaign undetected.

In this research, we will highlight the inner workings of the r77 rootkit and explore how it was used in conjunction with the crypto miner. We hope to raise awareness of the ongoing threat posed by cybercriminals and encourage individuals and organizations to take proactive steps to protect their systems and networks.

## Code analysis

### Overview

The rootkit is comprised of 4 distinct modules:

1. The installer module.
2. The stager module.
3. The service module.
4. The core module.

![r77 rootkit and crypto miner execution flow](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image3.jpg)

We will cover each module and phase in detail below.

### Installer module

Its first task is to store the stager module PE in the registry, a technique commonly used by malware authors to persistently store their malicious code on a system. Once the stager module is stored in the registry, the installer module builds a PowerShell command that loads the stager module from the registry and executes it, the installer module then creates a scheduled task to run the PowerShell command.

The installer locates the stager module stored as a PE resource named **EXE** , it then creates a new registry key called **$77stager** in the **HKEY_LOCAL_MACHINE\SOFTWARE** hive and writes the stager module to the key.

![Writing the stager module to the registry](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image2.jpg)

The installer then builds a PowerShell command to reflectively load the .NET stager in memory, using the **[Reflection.Assembly]::Load** method. Additionally, [Microsoft’s Antimalware Scan Interface](https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal) (AMSI) is circumvented by patching the **AmsiScanBuffer** API so that it will always return an [**AMSI_RESULT_CLEAN**](https://learn.microsoft.com/en-us/windows/win32/api/amsi/ne-amsi-amsi_result) response. **AMSI_RESULT_CLEAN** means that the scanned content is “Known good. No detection found, and the result is likely not going to change after a future definition update.” The PowerShell command is then obfuscated by replacing variable names with random strings.

![Obfuscated PowerShell command bypassing AMSI](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image7.jpg)

Finally, the installer creates a scheduled task to execute the PowerShell command using COM objects, the task is configured to execute at startup with the SYSTEM account.

![The installer module creates a scheduled task](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image6.jpg)

### Stager module

The stager is a .NET-based binary and it is responsible for unhooking DLLs, adjusting the SeDebugPrivilege setting, decrypting and decompressing the service module, and injecting the service module. This is accomplished using a process hollowing technique into a newly spawned process under another legitimate process through PPID spoofing.

#### API unhooking

To defeat the userland inline API hooking set by endpoint solutions, the stager module first completely unhooks two important DLLs that contain the API used by the rootkit, namely **NTDLL.dll** and **KERNEL32.dll**.

![Unhooking NTDLL and KERNEL32](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image3.jpg)

This technique involves the following steps:

1. **Retrieving the DLL** : The stager module reads the target DLL file from the disk.
2. **Mapping the DLL to memory** : The stager module creates a new file mapping using the CreateFileMapping function, which allows the DLL to be loaded into the process's memory.
3. **Analyzing the DLL's section table** : The stager module analyzes the section table of the newly mapped DLL to identify the relevant section where the executable code (often referred to as the **.text** section) is stored.
4. **Overwriting the code section** : Once the **.text** section is identified, the stager module replaces the contents of the corresponding section in the already loaded DLL with the code from the fresh **.text** section.

#### SeDebugPrivilege

The stager module next attempts to obtain the **SeDebugPrivilege** which allows it to inspect and adjust the memory of other processes.

This technique triggers Elastic’s [SeDebugPrivilege Enabled by a Suspicious Process](https://www.elastic.co/guide/en/security/current/sedebugprivilege-enabled-by-a-suspicious-process.html) detection rule.

#### Service module decryption and decompression

Two versions of the same service module are stored in the resource section of the stager, a 32-bit and 64-bit version that will be deployed according to the system architecture.

The payload is compressed using the GZip compression algorithm and it uses a simple XOR for decryption. After decompression, the stager uses the first 4-bytes as an XOR key to decrypt the rest of the data.

![Decrypting the payload](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image4.jpg)

#### Parent PID spoofing

To make the process hollowing injection appear legitimate, the parent PID spoofing technique is used to evade threat hunters and security tooling. This technique allows attackers to run processes under any parent process they want.

The malware first gets the process ID of the running **winlogon.exe** process which is a component of the Microsoft Windows operating system.

![Retrieving the winlogon.exe process ID](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image1.jpg)

It then uses 5 Windows APIs:

1. **OpenProcess** : Get the parent process handle.
2. **InitializeProcThreadAttributeList** : Initialize the attribute list.
3. **UpdateProcThreadAttribute:** Set the parent process handle via the **PROC_THREAD_ATTRIBUTE_PARENT_PROCESS** attribute.
4. **CreateProcess:** Creates a new process under the spoofed parent

![Parent process PID spoofing](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image8.jpg

This technique triggers Elastic’s [Parent Process PID Spoofing](https://www.elastic.co/guide/en/security/current/parent-process-pid-spoofing.html) detection rule.

#### Process hollowing

The malware leverages the process hollowing technique to inject its payload into a legitimate-looking Microsoft process, it chooses either **C:\\Windows\\System32\\dllhost.exe** or **C:\\Windows\\SysWow64\\dllhost.exe** depending on the malware and the machine architecture. To further obfuscate its presence, the malware generates a random GUID and generates a command line string, assigning it to the newly created process. This command line string includes the **/processid:** parameter and the GUID to mimic the behavior of a genuine **dllhost.exe** process and make it more difficult to detect.

![Malware executing the process hollowing technique](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image9.jpg

### Service module

The service module is another essential component of the r77 rootkit responsible for carrying out critical tasks such as configuration setup in the registry. One of the primary tasks of the service module is to inject the rootkit's core into every running process on the system.

#### Unhooking DLLs

Using the same technique used in the stager, the binary unhooks both **NTDLL.dll** and **KERNEL32.dll**.

#### Config setup

The service module stores the configuration as registry entries; it first creates a key in the **HKEY_LOCAL_MACHINE\*\*** SOFTWARE\$77config\*\* file that can be modified by any user on the machine.

![Creating the first configuration registry key](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image10.jpg)

It then stores the current process ID running the service module as a value in a registry key named either **“svc32”** or **“svc64”** under the key **HKEY_LOCAL_MACHINE\*\*** SOFTWARE\$77config\pid\*\*. The svc32/64 key name is based on the system architecture.

#### Injecting the core rootkit

The final task of the service module is to create two callbacks that are responsible for injecting the final rookit’s core. The core is a DLL stored as a resource in every running process except a handful specified by the threat actor in the configuration before compiling the rootkit.

The first callback is responsible for injection into every running process of the rootkit’s core, it does that by enumerating all running processes every 100 ms.

The second callback is responsible for injection into newly created child processes of already infected parent processes, an inter-process communication between the service and an infected process is used to catch child process creation.

The rootkit’s core hooks multiple Windows APIs. One of the important APIs is **NtResumeThread**. A parent process calls this API to start the thread execution after the creation of the child process, the installed hook sends the child’s PID to the service module through a named PIPE, in turn, the service module injects into it if the conditions allow it.

The threat actors purposely avoid injection into these specific processes:

- **MSBuild.exe**
- **Services.exe**
- **regsvr32.exe**
- **Svchost.exe**
- **WmiPrvSE.exe**
- **OffOn.exe**
- **OnOff.exe**
- **rutserv.exe**
- **rfusclient.exe**
- **RMS.exe**
- **msiexec.exe**
- **Ma_ss.exe**
- **masscan.exe**
- **NLBrute.exe**
- **run.exe**
- **Checker.exe**
- **Xfit.exe**
- **cracker64.exe**
- **SSH_Checker.exe**
- **ViewLog.exe**

### The rootkit’s core

The last module is the core module, responsible for installing hooks on important Windows APIs and filtering the output of said APIs according to the rootkit’s configuration. It is a DLL loaded into running processes by the service module. Its main purpose is to set hooks using the [Detours](https://github.com/microsoft/Detours) project on important Windows API namely

- **NtQuerySystemInformation**
- **NtResumeThread**
- **NtQueryDirectoryFile**
- **NtQueryDirectoryFileEx**
- **NtEnumerateKey**
- **NtEnumerateValueKey**
- **EnumServiceGroupW**
- **EnumServicesStatusExW**
- **NtDeviceIoControlFile**

![Hooking NT Windows APIs](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image8.jpg

These Native Windows APIs are used to enumerate/fetch information about the system, an example of that is **regedit** which relies heavily on **NtEnumerateKey** and **NtEnumerateValueKey** to enumerate the system’s registry keys. The installed hook is capable of enumerating the keys and filtering out keys that are configured by the threat actors, the rest is forwarded to the **regedit** process.

By filtering the output of the Windows APIs, the core module is able to selectively hide specific files, processes, or registry keys from the system's users and security tools.

### Packed PowerShell

Upon further examination, our team discovered an additional binary file within the miner campaign: **$77_loader.exe**. This file, which was packed with [SAPIEN PowerShell Studio](https://www.sapien.com/software/powershell_studio), is a .NET binary that loads an embedded PowerShell script and executes it. This PowerShell script serves as the orchestrator for the entire miner campaign, directing the various processes and actions necessary to successfully install and operate a legitimate and popular crypto miner. The PowerShell script was responsible for downloading a compiled version of the open source [XMRIG miner](https://github.com/xmrig/xmrig). Specifically, the version used in this campaign was **6.15.2** , which was released in October 2021. Interestingly, the download appeared to originate from the domain **msupdate[.]info**, a well-documented and malicious domain.

![PowerShell script attempt to download XMRIG](/assets/images/elastic-security-labs-steps-through-the-r77-rootkit/image9.jpg

The script included code to configure and execute the r77 rootkit and was responsible for opening specific firewall ports including **703** , **708** , **757** , **999** , **8080** , **443** , **80** , **14444** , **24444** , and **34444**. The script also downloaded and set up the [Remote Manipulator System](https://ru.wikipedia.org/wiki/Remote_Manipulator_System) (RMS) tool, a closed source program for remote administration, developed by the Russian company TektonIT, which could be used to remotely control the infected machine and issue commands from a remote location. Finally, the script created a new admin user ( **adm** ) on the targeted system, which could potentially be used to carry out additional attacks or exfiltrate sensitive data.

## Detection logic

### Prevention

- [Parent Process PID Spoofing](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_parent_process_pid_spoofing.toml)
- [Unusual Parent-Child Relationship](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_parent_child_relationship.toml)
- [Suspicious PowerShell Engine ImageLoad](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_unusual_powershell_engine_imageload.toml)
- [Privilege Escalation via EXTENDED STARTUPINFO](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/privilege_escalation_privilege_escalation_via_extended_startupinfo.toml)
- [Unusual Process Running as Antimalware Protected](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_unusual_process_running_as_antimalware_protected.toml)

### Detection

- [Parent Process PID Spoofing](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_parent_process_pid_spoofing.toml)
- [Unusual Parent-Child Relationship](https://github.com/elastic/detection-rules/blob/main/rules/windows/privilege_escalation_unusual_parentchild_relationship.toml)
- [Suspicious PowerShell Engine ImageLoad](https://github.com/elastic/detection-rules/blob/main/rules/windows/execution_suspicious_powershell_imgload.toml)
- [Process Created with an Elevated Token](https://www.elastic.co/guide/en/security/current/process-created-with-an-elevated-token.html)

### YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify the r77 rootkit.

```
rule Windows_Rootkit_R77_1 {
    meta:
        author = "Elastic Security"
        creation_date = "2022-03-04"
        last_modified = "2022-04-12"
        license = "Elastic License v2"
        os = "Windows"
        arch = "x86"
        category_type = "Rootkit"
        family = "R77"
        threat_name = "Windows.Rootkit.R77"
        reference_sample = "cfc76dddc74996bfbca6d9076d2f6627912ea196fdbdfb829819656d4d316c0c"

    strings:
        $a = { 01 04 10 41 8B 4A 04 49 FF C1 48 8D 41 F8 48 D1 E8 4C 3B C8 }
    condition:
        all of them
}

rule Windows_Rootkit_R77_2 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-09"
        last_modified = "2023-05-09"
        license = "Elastic License v2"
        os = "Windows"
        arch = "x86"
        category_type = "Rootkit"
        family = "R77"
        threat_name = "Windows.Rootkit.R77"
        reference_sample = "21e7f69986987fc75bce67c4deda42bd7605365bac83cf2cecb25061b2d86d4f"

    strings:
        $a1 = { 8C 20 88 00 00 00 42 8B 44 21 10 42 8B 4C 21 1C 48 2B D0 49 }
        $a2 = { 53 00 4F 00 46 00 54 00 57 00 41 00 52 00 45 00 5C 00 24 00 37 00 37 00 63 00 6F 00 6E 00 66 00 69 00 67 00 }
    condition:
        all of them
}

rule Windows_Rootkit_R77_3 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-09"
        last_modified = "2023-05-09"
        license = "Elastic License v2"
        os = "Windows"
        arch = "x86"
        category_type = "Rootkit"
        family = "R77"
        threat_name = "Windows.Rootkit.R77"
        reference_sample = "3dc94c88caa3169e096715eb6c2e6de1b011120117c0a51d12f572b4ba999ea6"

    strings:
        $a1 = { 5C 00 5C 00 2E 00 5C 00 70 00 69 00 70 00 65 00 5C 00 24 00 37 00 37 00 63 00 68 00 69 00 6C 00 64 00 70 00 72 00 6F 00 63 00 36 00 34 00 }
        $a2 = { 5C 00 5C 00 2E 00 5C 00 70 00 69 00 70 00 65 00 5C 00 24 00 37 00 37 00 63 00 68 00 69 00 6C 00 64 00 70 00 72 00 6F 00 63 00 33 00 32 00 }
    condition:
        all of them
}

rule Windows_Rootkit_R77_4 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-18"
        last_modified = "2023-05-18"
        license = "Elastic License v2"
        os = "Windows"
        arch = "x86"
        category_type = "Rootkit"
        family = "R77"
        threat_name = "Windows.Rootkit.R77"
        reference_sample = "91c6e2621121a6871af091c52fafe41220ae12d6e47e52fd13a7b9edd8e31796"

    strings:
        $a = { 33 C9 48 89 8C 24 C0 00 00 00 4C 8B CB 48 89 8C 24 B8 00 00 00 45 33 C0 48 89 8C 24 B0 00 00 00 48 89 8C 24 A8 00 00 00 89 8C 24 A0 00 00 00 }
    condition:
        $a
}

rule Windows_Rootkit_R77_5 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-18"
        last_modified = "2023-05-18"
        license = "Elastic License v2"
        os = "Windows"
        arch = "x86"
        category_type = "Rootkit"
        family = "R77"
        threat_name = "Windows.Rootkit.R77"
        reference_sample = "916c805b0d512dd7bbd88f46632d66d9613de61691b4bd368e4b7cb1f0ac7f60"

    strings:
        $r77_str0 = "$77stager" wide fullword
        $r77_str1 = "$77svc32" wide fullword
        $r77_str2 = "$77svc64" wide fullword
        $r77_str3 = "\\\\.\\pipe\\$77childproc64" wide fullword
        $r77_str4 = "SOFTWARE\\$77config"
        $obfuscate_ps = { 0F B7 04 4B 33 D2 C7 45 FC 34 00 00 00 F7 75 FC 66 8B 44 55 90 66 89 04 4B 41 3B CE }
        $amsi_patch_ps = "[Runtime.InteropServices.Marshal]::Copy([Byte[]](0xb8,0x57,0,7,0x80,0xc3)" wide fullword
    condition:
        ($obfuscate_ps and $amsi_patch_ps) or (all of ($r77_str*))
}

rule Windows_Rootkit_R77_6 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-18"
        last_modified = "2023-05-18"
        license = "Elastic License v2"
        os = "Windows"
        arch = "x86"
        category_type = "Rootkit"
        family = "R77"
        threat_name = "Windows.Rootkit.R77"
        reference_sample = "96849108e13172d14591169f8fdcbf8a8aa6be05b7b6ef396d65529eacc02d89"

    strings:
        $str0 = "service_names" wide fullword
        $str1 = "process_names" wide fullword
        $str2 = "tcp_local" wide fullword
        $str3 = "tcp_remote" wide fullword
        $str4 = "startup" wide fullword
        $str5 = "ReflectiveDllMain" ascii fullword
        $str6 = ".detourd" ascii fullword
        $binary0 = { 48 8B 10 48 8B 0B E8 ?? ?? ?? ?? 85 C0 74 ?? 48 8B 57 08 48 8B 4B 08 E8 ?? ?? ?? ?? 85 C0 74 ?? 48 8B 57 10 48 8B 4B 10 E8 ?? ?? ?? ?? 85 C0 74 ?? 48 8B 57 18 48 8B 4B 18 E8 ?? ?? ?? ?? 85 C0 74 ?? 48 8B 57 20 48 8B 4B 20 E8 ?? ?? ?? ?? 85 C0 74 ?? 48 8B 57 28 48 8B 4B 28 E8 ?? ?? ?? ?? 85 C0 }
        $binary1 = { 8B 56 04 8B 4F 04 E8 ?? ?? ?? ?? 85 C0 74 ?? 8B 56 08 8B 4F 08 E8 ?? ?? ?? ?? 85 C0 74 ?? 8B 56 0C 8B 4F 0C E8 ?? ?? ?? ?? 85 C0 74 ?? 8B 56 10 8B 4F 10 E8 ?? ?? ?? ?? 85 C0 74 ?? 8B 56 14 8B 4F 14 E8 ?? ?? ?? ?? 85 C0 74 ?? 8B 56 18 8B 4F 18 E8 ?? ?? ?? ?? 85 C0 74 ?? 8B 56 1C 8B 4F 1C }
    condition:
        (all of ($str*)) or $binary0 or $binary1
}
```

## References

The following were referenced throughout the above research

- [https://github.com/microsoft/Detours](https://github.com/microsoft/Detours)
- [https://github.com/xmrig/xmrig](https://github.com/xmrig/xmrig)
- [https://ru.wikipedia.org/wiki/Remote_Manipulator_System](https://ru.wikipedia.org/wiki/Remote_Manipulator_System)

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/r77) in both ECS and STIX format.

The following observables were discussed in this research.

| Indicator                                                        | Type    | Name            | Reference                               |
| ---------------------------------------------------------------- | ------- | --------------- | --------------------------------------- |
| msupdate[.]info                                                  | Domain  | n/a             | C2                                      |
| 5.133.65.53                                                      | IPV4    | n/a             | C2                                      |
| 5.133.65.54                                                      | IPV4    | n/a             | C2                                      |
| 5.133.65.55                                                      | IPV4    | n/a             | C2                                      |
| 5.133.65.56                                                      | IPV4    | n/a             | C2                                      |
| 916c805b0d512dd7bbd88f46632d66d9613de61691b4bd368e4b7cb1f0ac7f60 | SHA-256 | $77_Install.exe | Installer module                        |
| 9fb38412cac94255a3abbec80f15620098a0c85247690850c302a9ff060b5c0c | SHA-256 | n/a             | Stager module                           |
| 96849108e13172d14591169f8fdcbf8a8aa6be05b7b6ef396d65529eacc02d89 | SHA-256 | n/a             | 64 bit core module                      |
| aeb6a7b9ca890dc08259d7c239eb188e466210d48a17640671cba398bf69392f | SHA-256 | n/a             | 32 bit core module                      |
| 91c6e2621121a6871af091c52fafe41220ae12d6e47e52fd13a7b9edd8e31796 | SHA-256 | n/a             | 64 bit service module                   |
| 29bc88a316e3f34ed29c5358e459b9fbf3b7962a72cac388ab5c977dd990ea77 | SHA-256 | n/a             | 32 bit Service module                   |
| 10165e27e0db0a6708f346ddea657ab0409499f93eb8426a80864a966f0f401e | SHA-256 | RMS.exe         | Remote Manipulator System(RMS)          |
| 757fa687a9b4d461ffda78d93e4d812003307a9b9747dce7fb469625429cc551 | SHA-256 | $77_oracle.exe  | XMRIG miner                             |
| a7e31abe10be6bca44f0a846d631e578efe78c14f6bf1cf834cfb15469fc1d3a | SHA-256 | $77_Loader.exe  | .NET binary loading a PowerShell script |
