---
title: "Inside Microsoft's plan to kill PPLFault"
slug: "inside-microsofts-plan-to-kill-pplfault"
date: "2023-09-15"
description: "In this research publication, we'll learn about upcoming improvements to the Windows Code Integrity subsystem that will make it harder for malware to tamper with Anti-Malware processes and other important security features."
author:
  - slug: gabriel-landau
image: "photo-edited-04@2x.jpg"
category:
  - slug: security-research
tags:
  - security-research
  - detection-science
---

On September 1, 2023, Microsoft released a new build of Windows Insider Canary, version 25941. Insider builds are pre-release versions of Windows that include experimental features that may or may not ever reach General Availability (GA). Build 25941 includes improvements to the Code Integrity (CI) subsystem that mitigate a long-standing issue that enables attackers to load unsigned code into Protected Process Light (PPL) processes.

The PPL mechanism was introduced in Windows 8.1, enabling specially-signed programs to run in such a way that they are protected from tampering and termination, even by administrative processes. The goal was to keep malware from running amok — tampering with critical system processes and terminating anti-malware applications. There is a hierarchy of PPL “levels,” with higher-privilege ones immune from tampering by lower-privilege ones, but not vice-versa. Most PPL processes are managed by Microsoft but members of the [Microsoft Virus Initiative](https://learn.microsoft.com/en-us/microsoft-365/security/intelligence/virus-initiative-criteria?view=o365-worldwide) are allowed to run their products at the [less-trusted Anti-Malware PPL level](https://learn.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-).

![A simplified diagram of the heirarchy of PPL levels](/assets/images/inside-microsofts-plan-to-kill-pplfault/PPL-Table.jpg)

A few core Windows components run at the highest level of PPL, called Windows Trusted Computing Base (**WinTcb-Light**). Because of the protection afforded to these components and their narrow scope of function, they are considered more trusted than most user mode code. Most of these processes (such as **csrss.exe**) and their complex kernel-mode counterparts (such as **win32k.sys**) were written decades ago under different assumptions when the kernel-user boundary was even weaker than it is today. Rather than rewrite all these components, Microsoft made these user mode processes **WinTcb-Light**, mitigating tampering and injection attacks. [Alex Ionescu](https://twitter.com/aionescu) stated it clearly in 2013:

>Because the Win32k.sys developers did not expect local code injection attacks to be an issue (they require Administrator rights, after all), many of these APIs didn’t even have SEH, or had other assumptions and bugs. Perhaps most famously, one of these, [discovered by j00ru](http://j00ru.vexillium.org/?p=1393), and still unpatched, has been used as the sole basis of the Windows 8 RT jailbreak. In [Windows 8.1 RT](http://forum.xda-developers.com/showthread.php?t=2092158), this jailbreak is “fixed”, by virtue that code can no longer be injected into Csrss.exe for the attack. [Similar](http://j00ru.vexillium.org/?p=1455) Win32k.sys exploits that relied on Csrss.exe are also mitigated in this fashion.

To reduce the attack surface, Microsoft runs most of their PPL code with less privilege than **WinTcb-Light**:

![APPL processes in Windows 11 22H2, as seen in Process Explorer
](/assets/images/inside-microsofts-plan-to-kill-pplfault/image4.png)

Microsoft does not consider PPL to be a [security boundary](https://www.microsoft.com/en-us/msrc/windows-security-servicing-criteria), meaning they won’t prioritize security patches for code-execution vulnerabilities discovered therein, but they have historically [addressed](https://itm4n.github.io/the-end-of-ppldump/) some such [vulnerabilities](https://x.com/GabrielLandau/status/1683854578767343619?s=20) on a less-urgent basis.

### Loading code into PPL processes

To load code into a PPL process, it must be signed by special certificates. This applies to both executables (process creation) and libraries (DLLs loads). For the sake of simplicity, we’ll focus on DLL loading, but the CI validation process is very similar for both. This article is focused on PPL, so we will not discuss kernel mode code integrity.

[Portable Executable](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format) (PE) files come in many extensions, including EXE, DLL, SYS, OCX, CPL, and SCR. While the extension may vary, they’re all quite similar at a binary level. For a PPL process to load and execute a DLL, a few steps must be taken. Note that these steps are simplified, but should be sufficient for this article:

 1. An application calls **[LoadLibrary](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-loadlibraryw)**, passing the path to the DLL to be loaded.
 2. **LoadLibrary** calls into the loader within NTDLL (e.g. **ntdll!LdrLoadDll**), which opens a handle to the file using an API such as **NtCreateFile**.
 3. The loader then passes this file handle to **[NtCreateSection](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ntcreatesection)**, asking the kernel memory manager to create a [section object](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/section-objects-and-views) which describes how the file is to be mapped into memory. A section object is also known as a [file mapping object](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping) in higher abstraction layers (such as Win32), but since we’re focused on the kernel, we’ll keep calling them section objects. The Windows loader always uses a specific type of section called an [executable image](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/executable-images) (aka [SEC_IMAGE](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createfilemappinga)), which can only be created from PE files.
 4. Before returning the section object to user mode, the memory manager checks the digital signature on the file to ensure it meets the requirements for the given level of PPL. The internal memory manager function **MiValidateSectionCreate** relies on the Code Integrity module **ci.dll** to handle the requisite cryptography and [PKI](https://en.wikipedia.org/wiki/Public_key_infrastructure) policy.
 5. The memory manager restructures the PE so that it can be mapped into memory and executed. This step involves creating multiple subsections, one for each of the different portions of the PE file that must be mapped differently. For example, global variables may be read-write, whereas the code may be execute-read. To achieve this granularity, the resulting regions of memory must have distinct [page table entries](https://en.wikipedia.org/wiki/Page_table) with different page permissions. Other changes may be applied here, such as applying relocations, but they are out of scope for this research publication.
 6. The kernel returns the new section handle to the loader in NTDLL.
 7. The NTDLL loader then asks the kernel memory manager to map a [view of the section](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/section-objects-and-views) into the process address space via the **[NtMapViewOfSection](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwmapviewofsection)** syscall. The memory manager complies.
 8. Once the view is mapped, the loader finishes the processing required to create a functional DLL in memory. The details of this are out of scope.

### Page hashes

In the above steps, we can see that a PE’s digital signature is validated during section creation, but there is another way that code can be loaded into the address space of a PPL process - [paging](https://en.wikipedia.org/wiki/Memory_paging).

Unmodified pages belonging to file-backed sections (including **SEC_IMAGE**) can be quickly discarded whenever the system is low on memory because there’s a copy of that exact data on disk. If the page is later touched, the CPU will issue a page fault, and the memory manager’s page fault handler will re-read that data from disk. Because **SEC_IMAGE** sections can only be created from immutable file data, and the signature has already been verified, the data is considered trusted.

PE files may be optionally built with the [**/INTEGRITYCHECK**](https://learn.microsoft.com/en-us/cpp/build/reference/integritycheck-require-signature-check?view=msvc-170) flag. This sets a flag in the PE header that, among other things, instructs the memory manager to create and store hashes of every page (aka “page hashes”) of that PE as sections are created from it. After reading a page from disk, the page fault handler calls **MiValidateInPage** to verify that the page hash hasn’t changed since the signature was initially verified. If the page hash has changed, the handler will raise an exception. This feature is useful for detecting [bit rot](https://en.wikipedia.org/wiki/Data_degradation) in the page file and a few types of attacks. Beyond **/INTEGRITYCHECK** images, page hashes are [also enabled](https://twitter.com/DavidLinsley11/status/1190810926762450944) for all modules loaded into full Protected Processes (not PPL), and drivers loaded into the kernel.

_**Note:** It is possible to create a **SEC_IMAGE** section from a file with [user-writable references](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-mmdoesfilehaveuserwritablereferences), a tactic employed by techniques like [Process Herpaderping](https://jxy-s.github.io/herpaderping/). The existence of user-writable references means that a file could be modified after the image section is created.  When a program attempts to use such a mutable file, the memory manager first copies the file’s contents to the page file, creating an immutable backing for the image section to prevent tampering. In this case, the section will not be backed by the original file, but instead by the page file. See [this Microsoft article](https://www.microsoft.com/en-us/security/blog/2022/06/30/using-process-creation-properties-to-catch-evasion-techniques/) for more information about user-writable references._

### Exploitation

In September 2022, Gabriel Landau from Elastic Security filed VULN-074311 with MSRC, notifying them of two [zero-day](https://www.trendmicro.com/vinfo/us/security/definition/zero-day-vulnerability) vulnerabilities in Windows: one admin-to-PPL and one PPL-to-kernel. Two exploits for these vulnerabilities were provided named [PPLFault](https://github.com/gabriellandau/PPLFault) and [GodFault](https://github.com/gabriellandau/PPLFault#godfault), respectively, along with their source code. These exploits allow malware to [bypass LSA protection](https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection), terminate or blind EDR software, and modify kernel memory to tamper with core OS behavior - all without the use of any vulnerable drivers. See [this article](https://www.elastic.co/security-labs/forget-vulnerable-drivers-admin-is-all-you-need) for more details on their impact.

The admin-to-PPL exploit PPLFault leverages the fact that page hashes are not validated for PPL and employs the [Cloud Filter API](https://learn.microsoft.com/en-us/windows/win32/api/_cloudapi/) to violate immutability assumptions of files backing **SEC_IMAGE** sections. PPLFault uses paging to inject code into a DLL loaded within a PPL process running as **WinTcb-Light**, the most privileged form of PPL. The PPL-to-kernel exploit GodFault first uses PPLFault to get **WinTcb-Light** code execution, then exploits the kernel’s trust of **WinTcb-Light** processes to modify kernel memory, granting itself full read-write access to physical memory.

Though MSRC [declined](https://www.elastic.co/security-labs/forget-vulnerable-drivers-admin-is-all-you-need) to take any action on these vulnerabilities, the Windows Defender team has [shown interest](https://twitter.com/PhilipTsukerman/status/1683861340207607813?s=20). PPLFault and GodFault were released at [Black Hat Asia](https://www.blackhat.com/asia-23/briefings/schedule/#ppldump-is-dead-long-live-ppldump-31052) in May 2023 alongside a mitigation to stop these exploits called [NoFault](https://github.com/gabriellandau/PPLFault/tree/main/NoFault).

### Mitigation
On September 1, 2023, Microsoft released build 25941 of Windows Insider Canary. This build adds a new check to the memory manager function **MiValidateSectionCreate** which enables page hashes for all images that reside on remote devices. Comparing 25941 against its predecessor 25936, we can see the following two new basic blocks:

![BinDiff comparison of MiValidateSectionCreate in builds 25936 and 25941](/assets/images/inside-microsofts-plan-to-kill-pplfault/Bindiff.jpg)

Decompiled into C, the new code looks like this:

![New check added in Windows build 25941](/assets/images/inside-microsofts-plan-to-kill-pplfault/New-Code-In-IDA.jpg)

When PPLFault is run, Windows Error Reporting generates an event log indicating a failure during a paging operation:

![PPLFault failing in build 25941 with STATUS_IN_PAGE_ERROR (0xC0000006)](/assets/images/inside-microsofts-plan-to-kill-pplfault/WER-Event-Log.jpg)

PPLFault requires its payload DLL to be loaded over the SMB network redirector to achieve the desired paging behavior. By forcing the use of page hashes for such network-hosted DLLs, the exploit can no longer inject its payload, so the vulnerability is fixed. The aforementioned [NoFault](https://github.com/gabriellandau/PPLFault/tree/main/NoFault) mitigation released at Black Hat also targets network redirectors, blocking such DLL loads into PPL entirely. Elastic Defend 8.9.0 and later block PPLFault - please update if you haven’t already.

Tracking down the exact point of failure in a kernel debugger, we can see the page fault handler invoking CI to validate page hashes, which fails with **STATUS_INVALID_IMAGE_HASH (0xC0000428)**. This is later converted to **STATUS_IN_PAGE_ERROR (0xC0000006)**.

```
0: kd> g
Breakpoint 1 hit
CI!CiValidateImagePages+0x360:
0010:fffff805`725028b4 b8280400c0      mov     eax,0C0000428h
7: kd> k
 # Child-SP          RetAddr               Call Site
00 fffff508`1b4a6dc0 fffff805`72502487     CI!CiValidateImagePages+0x360
01 fffff508`1b4a6f90 fffff805`6f2f1bbd     CI!CiValidateImageData+0x27
02 fffff508`1b4a6fd0 fffff805`6ee35de5     nt!SeValidateImageData+0x2d
03 fffff508`1b4a7020 fffff805`6efa167b     nt!MiValidateInPage+0x305
04 fffff508`1b4a70d0 fffff805`6ef9fffe     nt!MiWaitForInPageComplete+0x31b
05 fffff508`1b4a71d0 fffff805`6ef68692     nt!MiIssueHardFault+0x3fe
06 fffff508`1b4a72e0 fffff805`6f0a784b     nt!MmAccessFault+0x3b2
07 fffff508`1b4a7460 00007fff`ccf71500     nt!KiPageFault+0x38b
08 000000b6`776bf1b8 00007fff`d5500ac0     0x00007fff`ccf71500
09 000000b6`776bf1c0 00000000`00000000     0x00007fff`d5500ac0
7: kd> !error C0000428
Error code: (NTSTATUS) 0xc0000428 (3221226536) - Windows cannot verify the 
 digital signature for this file. A recent hardware or software change 
 might have installed a file that is signed incorrectly or damaged, or 
 that might be malicious software from an unknown source.
```

### Comparing behavior

With the fix introduced in build 25941, the final vulnerable build is 25936. Running PPLFault in both builds under a kernel debugger, we can use the following WinDbg command to see the files for which CI is computing page hashes:

```
bp /w "&CI!CipValidatePageHash == @rcx" CI!CipValidateImageHash 
 "dt _FILE_OBJECT @r8 FileName; g"
```

This command generates the following WinDbg output for build 25936, before the fix:

![Build 25936 using page hashes only for services.exe](/assets/images/inside-microsofts-plan-to-kill-pplfault/WinDbg-Output-25936.jpg)

Here is the WinDbg output for build 25941, which includes the fix:

![Build 25941 using page hashes for both services.exe and the PPLFault payload DLL loaded over SMB](/assets/images/inside-microsofts-plan-to-kill-pplfault/WinDbg-Output-25941.jpg)

### Conclusion

Despite taking [longer than it perhaps should](https://www.elastic.co/security-labs/forget-vulnerable-drivers-admin-is-all-you-need), it's exciting to see Microsoft taking steps to defend PPL processes (including Anti-Malware) from malware running as admin, and users will benefit if this improvement reaches GA soon. Many features in Insider, even security features, are not available in (and may never reach) GA. Microsoft is very conservative when it comes to changes with potential stability, compatibility, or performance risk; memory manager changes are among the risker types. For example, the PreviousMode kernel exploit mitigation [spotted in Insider last November](https://twitter.com/GabrielLandau/status/1597001955909697536?s=20) still hasn’t reached GA, even after _at least_ 10 months.

_Special thanks to [Grzegorz Tworek](https://twitter.com/0gtweet) for his help reverse engineering some kernel functions._