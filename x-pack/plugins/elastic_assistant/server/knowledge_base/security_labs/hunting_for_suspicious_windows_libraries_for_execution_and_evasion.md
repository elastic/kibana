---
title: "Hunting for Suspicious Windows Libraries for Execution and Defense Evasion"
slug: "Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion"
date: "2023-03-01"
description: "Learn more about discovering threats by hunting through DLL load events, one way to reveal the presence of known and unknown malware in noisy process event data."
author:
  - slug: samir-bousseaden
image: "blog-thumb-roman-columns.jpg"
category:
  - slug: security-operations
  - slug: security-research
  - slug: detection-science
tags:
  - detection engineering
  - threat hunting
  - threat detection
---

Dynamic-link library (DLL) image loads is one of the noisiest types of event in Windows, which may discourage defenders from using it for detection engineering or threat hunting. Even if logged in some environments, it’s often limited to function-specific DLLs such as scheduled tasks (taskschd.dll), Windows Management Instrumentation (wmiutil.dll) and potentially DLLs loading from a few suspicious folders. In addition to the data volume issue, the false positive (FP) rate of the detection rules using DLL events also tend to be proportional to the data volume.

Unfortunately, both advanced adversaries and also commodity malwares are taking advantage of those limitations to increase the chances of their attack success, especially during the delivery phase via diverse spear phishing procedures.

The most commonly observed delivery techniques are the following :

- Loading malicious DLLs using binary execution proxies Rundll32 and Regsvr32
- Sideloading a malicious DLL from a virtual disk image (ISO/VHD files) into a convenient signed benign binary
- Extracting a DLL from a malicious Microsoft Office document (i.e. Word, Excel) and immediately loading it via Visual Basic for Applications (VBA)
- Downloading or extracting a DLL using a [lolbin](https://lolbas-project.github.io/) and loading it by another program
- Sideloading a malicious DLL extracted from a compressed archive (zip, rar, etc) into a signed benign binary
- Dropping a malicious DLL in the current directory of an existing program vulnerable to DLL sideloading (e.g. OneDrive, Slack, Teams) via one of several means
- Less common but also very effective is the use of Windows Installer MSIEXEC to load a malicious DLL

# What DLL events do we log with Elastic Endpoint ?

With the exception of the following Microsoft DLLs, Elastic endpoint since version 7.16 records all non-Microsoft signed DLLs: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/table1.jpg)

We also added some enrichments to both DLL and process events that records the following metadata: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/table2.jpg)

Below is an example of device information for DLL and Process execution from mounted ISO and VHD files, two file objects increasingly used to deliver malware: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image14.jpg)

Here is an example of process execution relative file creation and modification times for svchost.exe : ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image18.jpg)

The relative execution time enrichment will help us create less noisy detection rules (we can match our rules against the first or few image load or process execution instances), and the device information will allow us to better target suspicious use of ISO/VHD files for malicious purposes.

# Detection

In this section we share some detection ideas that are both reliable signals and effectively match the most common scenarios we mentioned earlier.

## DLL via Rundll32 / Regsvr32

As captured in our own [Global Threat Report](https://www.elastic.co/security-labs/2022-elastic-global-threat-report-announcement), Rundll32 and Regsvr32 lolbins are two of the most abused binary execution proxies. These utilities can load malicious DLLs and are a commonly seen component of many phishing attacks (malicious shortcuts, ISO file, macro enabled documents): ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image7.jpg)

During a recent period of about 90 days, our internal malware sandbox saw roughly 21K malware alerts where the malicious file was a DLL loaded by either regsvr32 or to a lesser degree rundll32.

The following two endpoint behavior protection rules are effective against about 80% of those samples (~17k out of ~21k) leveraging rundll32 or regsvr32 to execute malicious modules: - [Unusual DLL Extension Loaded by Rundll32 or Regsvr32](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_unusual_dll_extension_loaded_by_rundll32_or_regsvr32.toml)- [RunDLL32/Regsvr32 Loads Dropped Executable](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_rundll32_regsvr32_loads_dropped_executable.toml)

### Rundll32 or Regsvr32 Executing an oversized File

The following EQL query correlates creation of an executable file event with file size equal or greater than 100MB (this threshold can be adjusted to your environment) subsequently followed by being loaded as a DLL via rundll32 or regsvr32:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image23.jpg)

Below are examples of malicious control panel (CPL) files with sizes over 700MB, a technique used to bypass AV file scanning and reputation-based cloud services that implement a maximum file size for uploaded files:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image34.jpg)

### Rundll32 or Regsvr32 loading a DLL with a suspicious original file name

Some malicious DLLs have a suspicious original file name, such as ending with .EXE extension or with a great mismatch between the length of the original file name and the actual DLL name. This kind of defense evasion is less common and is employed by a good number of known malware families:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image10.jpg)

A few examples:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image33.jpg)

## DLL via Disk Images

Embedding malicious payloads in virtual disk images isn’t new or particularly novel, but the technique has gained in popularity among commodity malware families.

### Suspicious ImageLoad from an ISO Mounted Device

The following rule looks for the execution of commonly-abused Windows binaries to load a DLL from a mounted virtual disk image:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image9.jpg)

Below are some example of the technique:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image20.jpg)

### Suspicious Microsoft Image Loaded from a Disk Image

The following rule is triggered when an executable, running from a mounted virtual disk image (.vhd, .iso), loads a suspicious Microsoft-signed DLL such as the taskschd, bitsproxy or vaultclient modules that are associated with some common malware capabilities like persistence, credential access, and evasion.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image30.jpg)

This query identifies many commodity malware families delivered via ISO files:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image6.jpg)

### Potential DLL SideLoad via a Renamed Signed Binary

The following query identifies attempts to load an unsigned DLL from a mounted virtual disk (.iso, .vhd) and using a renamed signed binary (original file name is different than the process name).

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image25.jpg)

This depicts some examples of matches where a signed and renamed program is loading a DLL from a mounted disk image:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image15.jpg)

### Potential DLL SideLoad via a Microsoft Signed Binary

This detection identifies attempts to load unsigned DLLs from a mounted virtual disk (.iso, .vhd) and using a signed Microsoft binary:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image3.jpg)

Below is an example in which Microsoft OneDrive and Windows Control Panel executables are abused to sideload malicious modules for initial access and execution.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image19.jpg)

## DLL from Archive Files

Similarly to virtual disk images, attackers can also use ZIP/RAR archive files with embedded malicious DLL paired with a trusted binary or a shortcut (LNK) file to gain access.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image5.jpg)

The following screen capture shows how this query identifies a malicious file from a RAR archive which was auto-extracted into a temporary user directory. This scenario is moderately common.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image27.jpg)

## DLL via Malicious Documents

Microsoft Office documents can be also used to deploy and load a malicious DLL to avoid spawning a suspicious child process. The following query correlates an executable (PE) file creation event with a DLL load event.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image11.jpg)

Below are some examples of malicious Word and Excel documents using this delivery technique.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image16.jpg)

## DLL via MSIEXEC

MsiExec is another great option when you need to execute malicious DLLs because this activity blends in well with legitimate software installers. Two observed delivery methods are:

- Calling the DLLRegisterServer export from a random DLL using the command-line arguments /y or /z as documented here
- Build an installer that uses custom actions to load and execute a DLL as documented here and here

The following query can be used to identify the execution of the built-in Windows Installer, MSIEXEC, to call the exported function and run code:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image26.jpg)

Examples where MSI is used to load malicious DLLs:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image4.jpg)

DLLs delivered via Windows Installer custom actions can be detected by correlating a DLL file creation event where the calling process is MsiExec and where that DLL is subsequently loaded by the same MsiExec process.

It's worth noting that there are some legitimate uses of Windows Installer custom actions and this query may require some filtering in environments where those are used.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image12.jpg)

The following query matches the Gwisin Ransomware documented by [AhnLab](https://asec.ahnlab.com/en/37483/) and for which a [PoC](https://github.com/ChoiSG/GwisinMsi) has been created.

## DLL delivery via lolbins

Some malware relies on trusted Microsoft binaries to download, decode or extract DLLs. This query correlates PE file creation or modification by common built-in tools, followed by an image load.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image13.jpg)

Examples of malware identified using this detection approach:

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image28.jpg)

## DLL sideload into existing program

The following detection identifies attempts to load a recently-created and unsigned DLL file by an already existing signed process within the same current directory. Comparing the difference between the creation time of the existing program and the DLL creation time we can spot these kinds of anomalies.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image29.jpg)

The next example matches when the malicious secure32.dll process (created 28 seconds ago) is written to the current OneDrivedirectory and automatically loaded by OneDrive.exe (created 2.5 years ago):

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image17.jpg)

## DLL loading from suspicious directories

Dropping a DLL to a user-writable directories and side loading that with a trusted binary is also a common pattern. The following query looks for this behavior and, by leveraging relative creation and modification times, it can reduce the alerts volume while limiting those to a time window following initial execution.

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image8.jpg)

The most commonly-targeted user-writable directories are `?:\Users\Public` and `?:\ProgramData`. The full query containing more than 70 suspicious folders can be found [here](https://github.com/elastic/detection-rules/blob/main/rules/windows/defense_evasion_unsigned_dll_loaded_from_suspdir.toml).

Below see a example depicting malicious matches where various trusted binaries were abused to load malicious DLLs: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image2.jpg)

![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image21.jpg)

## DLL load with a abnormal creation time

Another interesting scenario is identifying a DLL load event where the DLL has a suspicious creation time, and which could be a result of timestomping. This query compares inconsistencies between the creation time and filename modification time using dll.Ext.relative_file_name_modify_time and dll.Ext.relative_file_creation_time immediately followed by an image load: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image1.jpg)

The following is an example where malware drop DLLs in trusted directories and then use timestomping to ensure those DLLs blend in with existing files in those directories: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image22.jpg)

## DLL from removable device

DLL side-loading from a removable device is still a valid infection vector, especially for air-gapped networks. An example was recently shared by [Mandiant](https://www.mandiant.com/resources/blog/china-nexus-espionage-southeast-asia) involving an espionage-oriented threat. The following EQL query can be used to find similar behavior: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image24.jpg)

Here is an example with several matches: ![](/assets/images/Hunting-for-Suspicious-Windows-Libraries-for-Execution-and-Evasion/image31.jpg)

## Protection Rules

Elastic provides significant capabilities for identifying unusual or malicious library load events with existing behavior protection rules that take advantage of Windows Libraries events:

- [NTDLL Loaded from an Unusual Path](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_ntdll_loaded_from_an_unusual_path.toml)
- [Suspicious NTDLL Image Load](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_ntdll_image_load.toml)
- [DLL Loaded from an Archive File](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_dll_loaded_from_an_archive_file.toml)
- [Microsoft Office Loaded a Dropped Executable File](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_microsoft_office_loaded_a_dropped_executable_file.toml)
- [Suspicious ImageLoad from an ISO Mounted Device](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_imageload_from_an_iso_mounted_device.toml)
- [Potential Evasion via Oversized Image Load](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_evasion_via_oversized_image_load.toml)
- [Suspicious ImageLoad via Windows Update Auto Update Client](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_imageload_via_windows_update_auto_update_client.toml)
- [Privilege Escalation via Microsoft Exchange DLL Hijacking](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_privilege_escalation_via_microsoft_exchange_dll_hijacking.toml)
- [Potential DLL SideLoad via a Microsoft Signed Binary](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_dll_sideload_via_a_microsoft_signed_binary.toml)
- [Potential DLL SideLoad via a Renamed Signed Binary](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_dll_sideload_via_a_renamed_signed_binary.toml)
- [Library Load of a File Written by a Signed Binary Proxy](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/command_and_control_library_load_of_a_file_written_by_a_signed_binary_proxy.toml)
- [Potential DLL Search Order Hijacking of an Existing Program](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_dll_search_order_hijacking_of_an_existing_program.toml)
- [Suspicious DLLRegisterServer Execution via MSIEXEC](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_dllregisterserver_execution_via_msiexec.toml)
- [ImageLoad of a File dropped via SMB](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/lateral_movement_imageload_of_a_file_dropped_via_smb.toml)
- [RunDLL32/Regsvr32 Loads Dropped Executable](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_rundll32_regsvr32_loads_dropped_executable.toml)
- [Unusual DLL Extension Loaded by Rundll32 or Regsvr32](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_unusual_dll_extension_loaded_by_rundll32_or_regsvr32.toml)
- [RunDLL32/Regsvr32 Loads a DLL Downloaded via BITS](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_rundll32_regsvr32_loads_a_dll_downloaded_via_bits.toml)
- [Potential Initial Access via DLL Search Order Hijacking](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_initial_access_via_dll_search_order_hijacking.toml)
- [Suspicious Control Panel DLL Loaded by Explorer](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_control_panel_dll_loaded_by_explorer.toml)
- [Protected Process Light Bypass via DLL Tampering](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_protected_process_light_bypass_via_dll_tampering.toml)
- [Potential Privilege Escalation via DLL Redirection](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/privilege_escalation_potential_privilege_escalation_via_dll_redirection.toml)
- [Potential Privilege Escalation via Missing DLL](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/privilege_escalation_potential_privilege_escalation_via_missing_dll.toml)
- [Potential Privilege Escalation via Elevated IFileOperation](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/privilege_escalation_potential_privilege_escalation_via_elevated_ifileoperation.toml)
- [Suspicious DLL Loaded by Svchost](https://github.com/elastic/detection-rules/blob/main/rules/windows/persistence_service_dll_unsigned.toml)
- [Suspicious DLL Loaded from a Removable Media](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/initial_access_suspicious_dll_loaded_from_a_removable_media.toml)
- [Suspicious Control Panel DLL Loaded by Explorer](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_suspicious_control_panel_dll_loaded_by_explorer.toml)
- [Dynwrapx Image Load via Windows Scripts](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_dynwrapx_image_load_via_windows_scripts.toml)
- [Suspicious Image Load via Windows Scripts](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_suspicious_image_load_via_windows_scripts.toml)
- [Potential Image Load with a Spoofed Creation Time](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_image_load_with_a_spoofed_creation_time.toml)

## Conclusion

Compared to detections that rely on process execution events and where adversaries expose more detection opportunities via command-line flags and parent process relationships, designing detections based on DLL events requires more enrichment and correlation to decrease noise rate and increase confidence.

In this publication we shared numerous examples of how we’re using DLL events to identify threats. You can use the different capabilities Elastic endpoint offers to produce higher signal alerts, too. Given the multitude of methods of delivering malicious code as DLLs, though, relying on behavioral detections alone is not enough. Combining this logic with malware file classification, shellcode detection features, and user-entity based analytics (UEBA) improves the fidelity of this metadata for detection purposes.
