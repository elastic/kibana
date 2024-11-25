---
title: "BLISTER Loader"
slug: "blister-loader"
date: "2023-04-13"
description: "The BLISTER loader continues to be actively used to load a variety of malware."
author:
  - slug: cyril-francois
  - slug: daniel-stepanic
  - slug: salim-bitam
image: "blog-thumb-power-lines.jpg"
category:
  - slug: malware-analysis
tags:
  - blister
  - malware
---

## Key Takeaways

- BLISTER is a loader that continues to stay under the radar, actively being used to load a variety of malware including clipbankers, information stealers, trojans, ransomware, and shellcode
- In-depth analysis shows heavy reliance of Windows Native API’s, several injection capabilities, multiple techniques to evade detection, and counter static/dynamic analysis
- Elastic Security is providing a configuration extractor that can be used to identify key elements of the malware and dump the embedded payload for further analysis
- 40 days after the initial reporting on the BLISTER loader by Elastic Security, we observed a change in the binary to include additional architectures. This shows that this is an actively developed tool and the authors are watching defensive countermeasures

> For information on the BLISTER malware loader and campaign observations, check out our blog post and configuration extractor detailing this:
>
> - [BLISTER Campaign Analysis](https://www.elastic.co/security-labs/elastic-security-uncovers-blister-malware-campaign)
> - [BLISTER Configuration Extractor](https://www.elastic.co/security-labs/blister-configuration-extractor)

## Overview

The Elastic Security team has continually been monitoring the BLISTER loader since our initial [release](https://www.elastic.co/blog/elastic-security-uncovers-blister-malware-campaign) at the end of last year. This family continues to remain largely unnoticed, with low detection rates on new samples.

![Example of BLISTER loader detection rates](/assets/images/blister-loader/blister-loader-image37.jpg)

A distinguishing characteristic of BLISTER’s author is their method of tampering with legitimate DLLs to bypass static analysis. During the past year, Elastic Security has observed the following legitimate DLL’s patched by BLISTER malware:

| Filename       | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| dxgi.dll       | DirectX Graphics Infrastructure                                    |
| WIAAut.DLL     | WIA Automation Layer                                               |
| PowerCPL.DLL   | Power Options Control Panel                                        |
| WIMGAPI.DLL    | Windows Imaging Library                                            |
| rdpencom.dll   | RDPSRAPI COM Objects                                               |
| colorui.dll    | Microsoft Color Control Panel.                                     |
| termmgr.dll    | Microsoft TAPI3 Terminal Manager                                   |
| libcef.dll     | Chromium Embedded Framework (CEF) Dynamic Link Library             |
| CEWMDM.DLL     | Windows CE WMDM Service Provider                                   |
| intl.dll       | LGPLed libintl for Windows NT/2000/XP/Vista/7 and Windows 95/98/ME |
| vidreszr.dll   | Windows Media Resizer                                              |
| sppcommdlg.dll | Software Licensing UI API                                          |

Due to the way malicious code is embedded in an otherwise benign application, BLISTER may be challenging for technologies that rely on some forms of machine learning. Combined with code-signing defense evasion, BLISTER appears designed with security technologies in mind.

Our research shows that BLISTER is actively developed and has been [linked](https://www.trendmicro.com/en_us/research/22/d/Thwarting-Loaders-From-SocGholish-to-BLISTERs-LockBit-Payload.html?utm_source=trendmicroresearch&utm_medium=smk&utm_campaign=0422_Socgholish) in public reporting to [LockBit](https://malpedia.caad.fkie.fraunhofer.de/details/win.lockbit) ransomware and the [SocGholish](https://redcanary.com/threat-detection-report/threats/socgholish/) framework; in addition, Elastic has also observed BLISTER in relation to the following families: [Amadey](https://malpedia.caad.fkie.fraunhofer.de/details/win.amadey), [BitRAT](https://malpedia.caad.fkie.fraunhofer.de/details/win.bit_rat), [Clipbanker](https://malpedia.caad.fkie.fraunhofer.de/details/win.clipbanker), [Cobalt Strike](https://malpedia.caad.fkie.fraunhofer.de/details/win.cobalt_strike), [Remcos](https://malpedia.caad.fkie.fraunhofer.de/details/win.remcos), and [Raccoon](https://malpedia.caad.fkie.fraunhofer.de/details/win.raccoon) along with others.

In this post, we will explain how BLISTER continues to operate clandestinely, highlight the loader’s core capabilities (injection options, obfuscation, and anti-analysis tricks) as well as provide a configuration extractor that can be used to dump BLISTER embedded payloads.

Consider the following [sample](https://www.virustotal.com/gui/file/afb77617a4ca637614c429440c78da438e190dd1ca24dc78483aa731d80832c2) representative of BLISTER for purposes of this analysis. This sample was also used to develop the initial BLISTER family YARA signature, the configuration extraction script, and evaluate tools against against unknown x32 and x64 BLISTER samples.

## Execution Flow

The execution flow consists of the following phases:

- Deciphering the second stage
- Retrieving configuration and packed payload
- Payload unpacking
- Persistence mechanisms
- Payload injection

### Launch / Entry Point

During the first stage of the execution flow, BLISTER is embedded in a legitimate version of the [colorui.dll](https://www.virustotal.com/gui/file/1068e40851b243a420cb203993a020d0ba198e1ec6c4d95f0953f81e13046973/details) library. The threat actor, with a previously achieved foothold, uses the Windows built-in rundll32.exe utility to load BLISTER by calling the export function **LaunchColorCpl** :

```
Rundll32 execution arguments

rundll32.exe "BLISTER.dll,LaunchColorCpl"
```

The image below demonstrates how BLISTER’s DLL is modified, noting that the export start is patched with a function call (line 17) to the malware entrypoint.

![Export of Patched BLISTER DLL](/assets/images/blister-loader/blister-loader-image13.jpg)

If we compare one of these malicious loaders to the original DLL they masquerade as, we can see where the patch was made, the function no longer exists:

![Export of Original DLL Used by BLISTER](/assets/images/blister-loader/blister-loader-image11.jpg)

### Deciphering Second Stage

BLISTER’s second stage is ciphered in its [resource section](https://docs.microsoft.com/en-us/windows/win32/debug/pe-format#the-rsrc-section) (.rsrc).

The deciphering routine begins with a loop based sleep to evade detection:

![Initial Sleep Mechanism](/assets/images/blister-loader/blister-loader-image35.jpg)

BLISTER then enumerates and hashes each export of ntdll, comparing export names against loaded module names; searching specifically for the **NtProtectVirtualMemory** API:

![API Hash](/assets/images/blister-loader/blister-loader-image40.jpg)

Finally, it looks for a memory region of 100,832 bytes by searching for a specific memory pattern, beginning its search at the return address and leading us in the .rsrc section. When found, BLISTER performs an eXclusive OR (XOR) operation on the memory region with a four-byte key, sets it’s page protection to PAGE_EXECUTE_READ with a call to NtProtectVirtualMemory, and call its second stage entry point with the deciphering key as parameter:

![Memory Tag & Memory Region Setup](/assets/images/blister-loader/blister-loader-image49.jpg)

### Obfuscation

BLISTER’s second-stage involves obfuscating functions, scrambling their control flow by splitting their basic blocks with unconditional jumps and randomizing basic blocks’ locations. An example of which appears below.

![Function’s Control Flow Scrambling](/assets/images/blister-loader/blister-loader-image6.jpg)

BLISTER inserts junk code into basic blocks as yet another form of defense evasion, as seen below.

![Junk Code Insertion](/assets/images/blister-loader/blister-loader-image30.jpg)

### Retrieving Configuration and Packed Payload

BLISTER uses the previous stage’s four-byte key to locate and decipher its configuration.

The routine begins by searching its memory, beginning at return address, for its four-byte key XORed with a hardcoded value as memory pattern:

![Memory pattern search loop](/assets/images/blister-loader/blister-loader-image24.jpg)

When located, the 0x644 byte configuration is copied and XOR-decrypted with the same four-byte key:

![Config decryption](/assets/images/blister-loader/blister-loader-image45.jpg)

Finally, it returns a pointer to the beginning of the packed PE, which is after the 0x644 byte blob:

![Pointer return to packed PE](/assets/images/blister-loader/blister-loader-image58.jpg)

See the [configuration structure](https://www.elastic.co/security-labs/blister-loader#configuration-structure) in the appendix.

### Time Based Anti Debug

After loading the configuration, and depending if the **kEnableSleepBasedAntiDebug** flag (0x800) is set, BLISTER calls its time-based anti-debug function:

![Check configuration for Sleep function](/assets/images/blister-loader/blister-loader-image60.jpg)

This function starts by creating a thread with the Sleep Windows function as a starting address and 10 minutes as the argument:

![Sleep function (600000 ms / 10 minutes)](/assets/images/blister-loader/blister-loader-image26.jpg)

The main thread will sleep using **NtDelayExecution** until the sleep thread has exited:

![NtDelayExecution used with Sleep function](/assets/images/blister-loader/blister-loader-image8.jpg)

Finally the function returns 0 when the sleep thread has run at least for 9 1/2 minutes:

![Condition to end sleep thread](/assets/images/blister-loader/blister-loader-image57.jpg)

If not, the function will return 1 and the process will be terminated:

![Process termination on sleep function if error](/assets/images/blister-loader/blister-loader-image16.jpg)

### Windows API

#### Blister’s GetModuleHandle

BLISTER implements its own **GetModuleHandle** to evade detection, the function takes the library name hash as a parameter, iterates over the process [PEB LDR](https://docs.microsoft.com/en-us/windows/win32/api/winternl/ns-winternl-peb_ldr_data)’s modules and checks the hashed module’s name against the one passed in the parameter:

![Function used to verify module names](/assets/images/blister-loader/blister-loader-image18.jpg)

#### Blister’s GetProcAddress

BLISTER’s **GetProcAddress** takes the target DLL and the export hash as a parameter, it also takes a flag that tells the function that the library is 64 bits.

The DLL can be loaded or mapped then the function iterates over the DLL’s export function names and compares their hashes with the ones passed in the parameter:

![BLISTER’s GetProcAddress hash checking dll’s exports](/assets/images/blister-loader/blister-loader-image3.jpg)

If the export is found, and its virtual address isn’t null, it is returned:

![Return export virtual address](/assets/images/blister-loader/blister-loader-image48.jpg)

Else the DLL is **LdrLoaded** and BLISTER’s **GetProcAddress** is called again with the newly loaded dll:

![LdrLoad the DLL and call GetProcAddress again](/assets/images/blister-loader/blister-loader-image19.jpg)

#### Library Manual Mapping

BLISTER manually maps a library using **NtCreateFile** in order to open a handle on the DLL file:

![NtCreateFile used within mapping function](/assets/images/blister-loader/blister-loader-image56.jpg)

Next it creates a section with the handle by calling **NtCreateSection** with the **SEC_IMAGE** attribute which tells Windows to loads the binary as a PE:

![NtCreateSection used within mapping function](/assets/images/blister-loader/blister-loader-image31.jpg)

_NtCreateSection used within mapping function_

Finally it maps the section with **NtMapViewOfSection** :

![NtMapViewofSection used within mapping function](/assets/images/blister-loader/blister-loader-image36.jpg)

#### x32/x64 Ntdll Mapping

Following the call to its anti-debug function, BLISTER manually maps 32 bit and 64 bit versions of NTDLL.

It starts by mapping the x32 version:

![32 bit NTDLL mapping](/assets/images/blister-loader/blister-loader-image43.jpg)

Then it disables [SysWOW64 redirection](https://docs.microsoft.com/en-us/windows/win32/winprog64/file-system-redirector):

![SysWOW64 disabled](/assets/images/blister-loader/blister-loader-image17.jpg)

And then maps the 64 bit version:

![64 bit NTDLL mapping](/assets/images/blister-loader/blister-loader-image50.jpg)

Then if available, the mapped libraries will be used with the **GetProcAddress** function, i.e:

![Mapped libraries using GetProcAddress](/assets/images/blister-loader/blister-loader-image7.jpg)

#### LdrLoading Windows Libraries and Removing Hooks

After mapping 32 and 64 bit **NTDLL** versions BLISTER will **LdrLoad** several Windows libraries and remove potential hooks:

![Function used to load Windows libraries and remove hooks](/assets/images/blister-loader/blister-loader-image5.jpg)

First, it tries to convert the hash to the library name by comparing the hash against a fixed list of known hashes:

![Hash comparison](/assets/images/blister-loader/blister-loader-image22.jpg)

If the hash is found BLISTER uses the **LdrLoad** to load the library:

![Leveraging LdrLoad to load DLL](/assets/images/blister-loader/blister-loader-image53.jpg)

Then BLISTER searches for the corresponding module in its own process:

![Searching for module in own process](/assets/images/blister-loader/blister-loader-image15.jpg)

And maps a fresh copy of the library with the module’s **FullDllName** :

![Retrieving Module’s FullDllName](/assets/images/blister-loader/blister-loader-image10.jpg)

![Manual Mapping function](/assets/images/blister-loader/blister-loader-image55.jpg)

BLISTER then applies the relocation to the mapped library with the loaded one as the base address for the relocation calculation:

![Performing relocation](/assets/images/blister-loader/blister-loader-image59.jpg)

Next BLISTER iterates over each section of the loaded library to see if the section is executable:

![Checking executable sections](/assets/images/blister-loader/blister-loader-image42.jpg)

If the section is executable, it is replaced with the mapped one, thus removing any hooks:

![Section replacement](/assets/images/blister-loader/blister-loader-image47.jpg)

#### x64 API Call

BLISTER can call 64-bit library functions through the use of special 64-bit function wrapper:

![BLISTER utilizing 64-bit function library caller](/assets/images/blister-loader/blister-loader-image29.jpg)

![64-bit function library caller](/assets/images/blister-loader/blister-loader-image54.jpg)

To make this call BLISTER switches between 32-bit to 64-bit code using the old Heaven’s Gate [technique](https://blog.talosintelligence.com/2019/07/rats-and-stealers-rush-through-heavens.html):

![Observed Heaven’s Gate byte sequences](/assets/images/blister-loader/blister-loader-image51.jpg)

![Heaven’s Gate - Transition to 64 bit mode](/assets/images/blister-loader/blister-loader-image20.jpg)

![Heaven’s Gate - Transition to 32 bit mode](/assets/images/blister-loader/blister-loader-image21.jpg)

## Unpacking Payload

During the unpacking process of the payload, the malware starts by allocating memory using **NtAllocateVirtualMemory** and passing in configuration information. A memcpy function is used to store a copy of encrypted/compressed payload in a buffer for next stage (decryption).

![Unpacking BLISTER payload](/assets/images/blister-loader/blister-loader-image2.jpg)

### Deciphering

BLISTER leverages the Rabbit stream [cipher](<https://en.wikipedia.org/wiki/Rabbit_(cipher)>), passing in the previously allocated buffer containing the encrypted payload, the compressed data size along with the 16-byte deciphering key and 8-byte IV.

![Decipher function using the Rabbit cipher](/assets/images/blister-loader/blister-loader-image1.jpg)

![Observed Rabbit Cipher Key and IV inside memory](/assets/images/blister-loader/blister-loader-image23.jpg)

### Decompression

After the decryption stage, the payload is then decompressed using **RtlDecompressBuffer** with the LZNT1 compression format.

![Decompression function using LZNT1](/assets/images/blister-loader/blister-loader-image9.jpg)

## Persistence Mechanism

To achieve persistence, BLISTER leverages Windows shortcuts by creating an LNK file inside the Windows startup folder. It creates a new directory using the **CreateDirectoryW** function with a unique hardcoded string found in the configuration file such as: C:\ProgramData`UNIQUE STRING\\>`

BLISTER then copies C:\System32\rundll32.exe and itself to the newly created directory and renames the files to UNIQUE STRING\\>.exe and UNIQUE STRING\\>.dll, respectively.

BLISTER uses the **CopyModuleIntoFolder** function and the **IFileOperation** Windows **COM** interface for [bypassing UAC](https://www.elastic.co/security-labs/exploring-windows-uac-bypasses-techniques-and-detection-strategies) when copying and renaming the files:

![BLISTER function used to copy files](/assets/images/blister-loader/blister-loader-image46.jpg)

The malware creates an LNK file using **IShellLinkW COM** interface and stores it in `C:\Users\<username>\AppData\Roaming\Microsft\Windows\Start Menu\Startup as UNIQUE STRING\\>.lnk`

![Mapping shortcut to BLISTER with arguments](/assets/images/blister-loader/blister-loader-image25.jpg)

The LNK file is set to run the export function **LaunchColorCpl** of the newly copied malware with the renamed instance of rundll32. C:\ProgramData\UNIQUE STRING\\>\UNIQUE STRING\\>.exe C:\ProgramData\UNIQUE STRING\\>\UNIQUE STRING\\>.dll,LaunchColorCpl

## Injecting Payload

BLISTER implements 3 different injection techniques to execute the payload according to the configuration flag:

![BLISTER injection techniques by config flag](/assets/images/blister-loader/blister-loader-image27.jpg)

### Shellcode Execution

After decrypting the shellcode, BLISTER is able to inject it to a newly allocated read write memory region with **NtAllocateVirtualMemory** API, it then copies the shellcode to it and it sets the memory region to read write execute with **NtProtectVirtualMemory** and then executes it.

![Execute shellcode function](/assets/images/blister-loader/blister-loader-image28.jpg)

### Own Process Injection

BLISTER can execute DLL or Executable payloads reflectively in its memory space. It first creates a section with **NtCreateSection** API.

![RunPE function](/assets/images/blister-loader/blister-loader-image39.jpg)

BLISTER then tries to map a view on the created section at the payload’s preferred base address. In case the preferred address is not available and the payload is an executable it will simply map a view on the created section at a random address and then do relocation.

![Check for conflicting addresses](/assets/images/blister-loader/blister-loader-image34.jpg)

Conversly, if the payload is a DLL, it will first unmap the memory region of the current process image and then it will map a view on the created section with the payload’s preferred address.

![DLL unmapping](/assets/images/blister-loader/blister-loader-image33.jpg)

BLISTER then calls a function to copy the PE headers and the sections.

![Copying over PE/sections](/assets/images/blister-loader/blister-loader-image12.jpg)

Finally, BLISTER executes the loaded payload in memory starting from its entry point if the payload is an executable. In case the payload is a DLL, it will find its export function according to the hash in the config file and execute it.

### Process Hollowing

BLISTER is able to perform [process hollowing](https://attack.mitre.org/techniques/T1055/012/) in a remote process:

First, there is an initial check for a specific module hash value (0x12453653), if met, BLISTER performs process hollowing against the Internet Explorer executable.

![Internet Explorer option for process hollowing](/assets/images/blister-loader/blister-loader-image32.jpg)

If not, the malware performs remote process hollowing with **Werfault.exe**. BLISTER follows standard techniques used for process hollowing.

![Process hollowing function](/assets/images/blister-loader/blister-loader-image44.jpg)

There is one path within this function: if certain criteria are met matching Windows OS versions and build numbers the hollowing technique is performed by dropping a temporary file on disk within the **AppData** folder titled **Bg.Agent.ETW** with an explicit extension.

![Compatibility Condition check](/assets/images/blister-loader/blister-loader-image52.jpg)

![Compatibility Condition function](/assets/images/blister-loader/blister-loader-image14.jpg)

![Temporary file used to store payload](/assets/images/blister-loader/blister-loader-image4.jpg)

The malware uses this file to read and write malicious DLL to this file. Werfault.exe is started by BLISTER and then the contents of this temporary DLL are loaded into memory into the Werfault process and the file is shortly deleted after.

![Procmon output of compatibility function](/assets/images/blister-loader/blister-loader-image38.jpg)

## Configuration Extractor

Automating the configuration and payload extraction from BLISTER is a key aspect when it comes to threat hunting as it gives visibility of the campaign and the malware deployed by the threat actors which enable us to discover new unknown samples and Cobalt Strike instances in a timely manner.

Our extractor uses a [Rabbit stream cipher implementation](https://github.com/Robin-Pwner/Rabbit-Cipher) and takes either a directory of samples with **-d** option or **-f** for a single sample,

![Config extractor output](/assets/images/blister-loader/blister-loader-image41.jpg)

To enable the community to further defend themselves against existing and new variants of the BLISTER loader, we are making the configuration extractor open source under the Apache 2 License. The configuration extractor documentation and binary download can be accessed [here](https://www.elastic.co/security-labs/blister-configuration-extractor).

## Conclusion

BLISTER continues to be a formidable threat, punching above its own weight class, distributing popular malware families and implants leading to major compromises. Elastic Security has been tracking BLISTER for months and we see no signs of this family slowing down.

From reversing BLISTER, our team was able to identify key functionality such as different injection methods, multiple techniques for defense evasion using anti-debug/anti-analysis features and heavy reliance on Windows Native API’s. We also are releasing a configuration extractor that can statically retrieve actionable information from BLISTER samples as well as dump out the embedded payloads.

## Appendix

### Configuration Structure

```
BLISTER configuration structure

struct Config {
  uint16_t flag;
  uint32_t payload_export_hash;
  wchar_t w_payload_filename_and_cmdline[783];
  size_t compressed_data_size;
  size_t uncompressed_data_size;
  uint8_t pe_deciphering_key[16];
  uint8_t pe_deciphering_iv[8];
};

```

### Configuration’s Flags

```
BLISTER configuration files

enum Config::Flags {
  kDoPersistance = 0x1,
  kOwnProcessReflectiveInjectionMethod = 0x2,
  kOwnProcessHollowingMethod = 0x8,
  kRemoteProcessHollowingMethod = 0x10,
  kExecutePayloadExport = 0x20,
  kExecuteShellcodeMethod = 0x40,
  kInjectWithCmdLine = 0x80,
  kSleepAfterInjection = 0x100,
  kEnableSleepBasedAntiDebug = 0x800,
};
```

### Hashing Algorithm

```
BLISTER hashing algorithm

uint32_t HashLibraryName(wchar_t *name) {
  uint32_t name {0};
  while (*name) {
 hash = ((hash >> 23) | (hash  << 9)) + *name++;
  }
  return hash ;
}
```

### Indicators

| Indicator                                                        | Type   | Note        |
| ---------------------------------------------------------------- | ------ | ----------- |
| afb77617a4ca637614c429440c78da438e190dd1ca24dc78483aa731d80832c2 | SHA256 | BLISTER DLL |

## YARA Rule

This updated YARA rule has shown a 13% improvement in detection rates.

```
BLISTER YARA rule

rule Windows_Trojan_BLISTER {
    meta:
        Author = "Elastic Security"
        creation_date = "2022-04-29"
        last_modified = "2022-04-29"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "BLISTER"
        threat_name = "Windows.Trojan.BLISTER"
        description = "Detects BLISTER loader."
        reference_sample = "afb77617a4ca637614c429440c78da438e190dd1ca24dc78483aa731d80832c2"

    strings:
        $a1 = { 8D 45 DC 89 5D EC 50 6A 04 8D 45 F0 50 8D 45 EC 50 6A FF FF D7 }
        $a2 = { 75 F7 39 4D FC 0F 85 F3 00 00 00 64 A1 30 00 00 00 53 57 89 75 }
        $a3 = { 78 03 C3 8B 48 20 8B 50 1C 03 CB 8B 78 24 03 D3 8B 40 18 03 FB 89 4D F8 89 55 E0 89 45 E4 85 C0 74 3E 8B 09 8B D6 03 CB 8A 01 84 C0 74 17 C1 C2 09 0F BE C0 03 D0 41 8A 01 84 C0 75 F1 81 FA B2 17 EB 41 74 27 8B 4D F8 83 C7 02 8B 45 F4 83 C1 04 40 89 4D F8 89 45 F4 0F B7 C0 3B 45 E4 72 C2 8B FE 8B 45 04 B9 }
        $b1 = { 65 48 8B 04 25 60 00 00 00 44 0F B7 DB 48 8B 48 ?? 48 8B 41 ?? C7 45 48 ?? ?? ?? ?? 4C 8B 40 ?? 49 63 40 ?? }
        $b2 = { B9 FF FF FF 7F 89 5D 40 8B C1 44 8D 63 ?? F0 44 01 65 40 49 2B C4 75 ?? 39 4D 40 0F 85 ?? ?? ?? ?? 65 48 8B 04 25 60 00 00 00 44 0F B7 DB }
    condition:
        any of them
}
```

## References

- [https://www.elastic.co/blog/elastic-security-uncovers-blister-malware-campaign](https://www.elastic.co/blog/elastic-security-uncovers-blister-malware-campaign)
- [https://www.trendmicro.com/en_us/research/22/d/Thwarting-Loaders-From-SocGholish-to-BLISTERs-LockBit-Payload.html](https://www.trendmicro.com/en_us/research/22/d/Thwarting-Loaders-From-SocGholish-to-BLISTERs-LockBit-Payload.html?utm_source=trendmicroresearch&utm_medium=smk&utm_campaign=0422_Socgholish)
- [https://redcanary.com/threat-detection-report/threats/socgholish/](https://redcanary.com/threat-detection-report/threats/socgholish/)

## Artifacts

Artifacts are also available for [download](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blte5a55b99e66b4794/628e88d91cd65960bcff2862/blister-indicators.zip) in both ECS and STIX format in a combined zip bundle.
