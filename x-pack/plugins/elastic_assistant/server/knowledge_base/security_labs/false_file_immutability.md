---
title: "Introducing a New Vulnerability Class: False File Immutability"
slug: "false-file-immutability"
date: "2024-07-11"
description: "This article introduces a previously-unnamed class of Windows vulnerability that demonstrates the dangers of assumption and describes some unintended security consequences."
author:
  - slug: gabriel-landau
image: "Security Labs Images 36.jpg"
category:
  - slug: security-research
  - slug: vulnerability-updates
---

# Introduction

This article will discuss a previously-unnamed vulnerability class in Windows, showing how long-standing incorrect assumptions in the design of core Windows features can result in both undefined behavior and security vulnerabilities. We will demonstrate how one such vulnerability in the Windows 11 kernel can be exploited to achieve arbitrary code execution with kernel privileges.


# Windows file sharing

When an application opens a file on Windows, it typically uses some form of the Win32 [**CreateFile**](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew) API.

``` c++
HANDLE CreateFileW(
  [in]           LPCWSTR               lpFileName,
  [in]           DWORD                 dwDesiredAccess,
  [in]           DWORD                 dwShareMode,
  [in, optional] LPSECURITY_ATTRIBUTES lpSecurityAttributes,
  [in]           DWORD                 dwCreationDisposition,
  [in]           DWORD                 dwFlagsAndAttributes,
  [in, optional] HANDLE                hTemplateFile
);
```

Callers of **CreateFile** specify the access they want in **dwDesiredAccess**. For example, a caller would pass **FILE_READ_DATA** to be able to read data, or **FILE_WRITE_DATA** to be able to write data. The full set of access rights are [documented](https://learn.microsoft.com/en-us/windows/win32/fileio/file-access-rights-constants) on the Microsoft Learn website.

In addition to passing **dwDesiredAccess**, callers must pass a “sharing mode” in **dwShareMode**, which consists of zero or more of **FILE_SHARE_READ**, **FILE_SHARE_WRITE**, and **FILE_SHARE_DELETE**. You can think of a sharing mode as the caller declaring “I’m okay with others doing X to this file while I’m using it,” where X could be reading, writing, or renaming. For example, a caller that passes **FILE_SHARE_WRITE** allows others to write the file while they are working with it.

As a file is opened, the caller’s **dwDesiredAccess** is tested against the **dwShareMode** of all existing file handles. Simultaneously, the caller’s **dwShareMode** is tested against the previously-granted **dwDesiredAccess** of all existing handles to that file. If either of these tests fail, then **CreateFile** fails with a sharing violation.

Sharing isn’t mandatory. Callers can pass a share mode of zero to obtain exclusive access. Per Microsoft [documentation](https://learn.microsoft.com/en-us/windows/win32/fileio/creating-and-opening-files):

> An open file that is not shared (dwShareMode set to zero) cannot be opened again, either by the application that opened it or by another application, until its handle has been closed. This is also referred to as exclusive access.


## Sharing enforcement

In the kernel, sharing is enforced by filesystem drivers. As a file is opened, it’s the responsibility of the filesystem driver to call [**IoCheckShareAccess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iocheckshareaccess) or [**IoCheckLinkShareAccess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iochecklinkshareaccess) to see whether the requested **DesiredAccess**/**ShareMode** tuple is compatible with any existing handles to the file being opened. [NTFS](https://learn.microsoft.com/en-us/windows-server/storage/file-server/ntfs-overview) is the primary filesystem on Windows, but it’s closed-source, so for illustrative purposes we’ll instead look at Microsoft’s FastFAT sample code performing [the same check](https://github.com/Microsoft/Windows-driver-samples/blob/622212c3fff587f23f6490a9da939fb85968f651/filesys/fastfat/create.c#L6822-L6884). Unlike an IDA decompilation, it even comes with comments!

``` c++
//
//  Check if the Fcb has the proper share access.
//

return IoCheckShareAccess( *DesiredAccess,
                           ShareAccess,
                           FileObject,
                           &FcbOrDcb->ShareAccess,
                           FALSE );
```

In addition to traditional read/write file operations, Windows lets applications map files into memory. Before we go deeper, it’s important to understand that [section objects](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/section-objects-and-views) are kernel parlance for [file mappings](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping); they are the same thing. This article focuses on the kernel, so it will primarily refer to them as section objects.

There are two types of section objects - data sections and executable image sections. Data sections are direct 1:1 mappings of files into memory. The file’s contents will appear in memory exactly as they do on disk. Data sections also have uniform memory permissions for the entire memory range. With respect to the underlying file, data sections can be either read-only or read-write. A read-write view of a file enables a process to read or write the file’s contents by reading/writing memory within its own address space.

Executable image sections (sometimes abbreviated to image sections) prepare [PE files](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format) to be executed. Image sections must be created from PE files. Examples of PE files include EXE, DLL, SYS, CPL, SCR, and OCX files. The kernel processes the PEs specially to prepare them to be executed. Different PE regions will be mapped in memory with different page permissions, depending on their metadata. Image views are [copy-on-write](https://en.wikipedia.org/wiki/Copy-on-write), meaning any changes in memory will be saved to the process’s private working set — never written to the backing PE.

Let’s say application A wants to map a file into memory with a data section. First, it opens that file with an API such as **ZwCreateFile**, which returns a file handle. Next, it passes this file handle to an API such as **ZwCreateSection** which creates a section object that describes how the file will be mapped into memory; this yields a section handle. The process then uses the section handle to map a “view” of that section into the process address space, completing the memory mapping.

![Diagram showing how a file is mapped into memory](/assets/images/false-file-immutability/image9.png)

Once the file is successfully mapped, process A can close both the file and section handles, leaving zero open handles to the file. If process B later wants to use the file without the risk of it being modified externally, it would omit **FILE_SHARE_WRITE** when opening the file. **IoCheckLinkShareAccess** looks for open file handles, but since the handles were previously closed, it will not fail the operation.

This creates a problem for file sharing. Process B thinks it has a file open without risk of external modification, but process A can modify it through the memory mapping. To account for this, the filesystem must also call [**MmDoesFileHaveUserWritableReferences**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-mmdoesfilehaveuserwritablereferences). This checks whether there are any active writable file mappings to the given file. We can see this check in the FastFAT example [here](https://github.com/Microsoft/Windows-driver-samples/blob/622212c3fff587f23f6490a9da939fb85968f651/filesys/fastfat/create.c#L6858-L6870):

``` c++
//
//  Do an extra test for writeable user sections if the user did not allow
//  write sharing - this is neccessary since a section may exist with no handles
//  open to the file its based against.
//

if ((NodeType( FcbOrDcb ) == FAT_NTC_FCB) &&
    !FlagOn( ShareAccess, FILE_SHARE_WRITE ) &&
    FlagOn( *DesiredAccess, FILE_EXECUTE | FILE_READ_DATA | FILE_WRITE_DATA | FILE_APPEND_DATA | DELETE | MAXIMUM_ALLOWED ) &&
    MmDoesFileHaveUserWritableReferences( &FcbOrDcb->NonPaged->SectionObjectPointers )) {

    return STATUS_SHARING_VIOLATION;
}
```

Windows requires PE files to be immutable (unmodifiable) while they are running. This prevents EXEs and DLLs from being changed on disk while they are running in memory. Filesystem drivers must use the [**MmFlushImageSection**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-mmflushimagesection) function to check whether there are any active image mappings of a PE before allowing **FILE_WRITE_DATA** access. We can see this in the [FastFAT example code](https://github.com/Microsoft/Windows-driver-samples/blob/622212c3fff587f23f6490a9da939fb85968f651/filesys/fastfat/create.c#L3572-L3593), and on [Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/executable-images).

``` c++
//
//  If the user wants write access access to the file make sure there
//  is not a process mapping this file as an image. Any attempt to
//  delete the file will be stopped in fileinfo.c
//
//  If the user wants to delete on close, we must check at this
//  point though.
//

if (FlagOn(*DesiredAccess, FILE_WRITE_DATA) || DeleteOnClose) {

    Fcb->OpenCount += 1;
    DecrementFcbOpenCount = TRUE;

    if (!MmFlushImageSection( &Fcb->NonPaged->SectionObjectPointers,
                              MmFlushForWrite )) {

        Iosb.Status = DeleteOnClose ? STATUS_CANNOT_DELETE :
                                      STATUS_SHARING_VIOLATION;
        try_return( Iosb );
    }
}
```

Another way to think of this check is that **ZwMapViewOfSection(SEC_IMAGE)** implies no-write-sharing as long as the view exists.


# Authenticode

The [Windows Authenticode Specification](https://download.microsoft.com/download/9/c/5/9c5b2167-8017-4bae-9fde-d599bac8184a/authenticode_pe.docx) describes a way to employ cryptography to “sign” PE files. A “digital signature” cryptographically attests that the PE was produced by a particular entity. Digital signatures are tamper-evident, meaning that any material modification of signed files should be detectable because the digital signature will no longer match. Digital signatures are typically appended to the end of PE files.

![Authenticode specification diagram showing a signature embedded within a PE](/assets/images/false-file-immutability/image19.png)

Authenticode can’t apply traditional hashing (e.g. **sha256sum**) in this case, because the act of appending the signature would change the file’s hash, breaking the signature it just generated. Instead, the Authenticode specification describes an algorithm to skip specific portions of the PE file that will be changed during the signing process. This algorithm is called **authentihash**. You can use authentihash with any hashing algorithm, such as SHA256. When a PE file is digitally signed, the file’s authentihash is what’s actually signed.


## Code integrity

Windows has a few different ways to validate Authenticode signatures. User mode applications can call [**WinVerifyTrust**](https://learn.microsoft.com/en-us/windows/win32/api/wintrust/nf-wintrust-winverifytrust) to validate a file’s signature in user mode. The Code Integrity (CI) subsystem, residing in ```ci.dll```,  validates signatures in the kernel. If [Hypervisor-Protected Code Integrity](https://learn.microsoft.com/en-us/windows-hardware/drivers/bringup/device-guard-and-credential-guard) is running, the Secure Kernel employs ```skci.dll``` to validate Authenticode. This article will focus on Code Integrity (```ci.dll```) in the regular kernel.

Code Integrity provides both Kernel Mode Code Integrity and User Mode Code Integrity, each serving a different set of functions.

Kernel Mode Code Integrity (KMCI):
 - Enforces [Driver Signing Enforcement](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/driver-signing) and the [Vulnerable Driver Blocklist](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/windows-defender-application-control/design/microsoft-recommended-driver-block-rules#microsoft-vulnerable-driver-blocklist)

User Mode Code Integrity (UMCI):
 - CI validates the signatures of EXEs and DLLs before allowing them to load
 - Enforces [Protected Processes and Protected Process Light](https://learn.microsoft.com/en-us/windows/security/threat-protection/overview-of-threat-mitigations-in-windows-10#protected-processes) signature requirements
 - Enforces **ProcessSignaturePolicy** mitigation ([**SetProcessMitigationPolicy**](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setprocessmitigationpolicy))
 - Enforces [INTEGRITYCHECK](https://learn.microsoft.com/en-us/cpp/build/reference/integritycheck-require-signature-check?view=msvc-170) for [FIPS 140-2 modules](https://x.com/GabrielLandau/status/1668353640833114131).
 - Exposed to consumers as [Smart App Control](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview)
 - Exposed to businesses as [App Control for Business](https://learn.microsoft.com/en-us/mem/intune/protect/endpoint-security-app-control-policy) (formerly WDAC)

KMCI and UMCI implement different policies for different scenarios. For example, the policy for Protected Processes is different from that of INTEGRITYCHECK.


# Incorrect assumptions

Microsoft [documentation](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea) implies that files successfully opened without write sharing can’t be modified by another user or process.

```
FILE_SHARE_WRITE
0x00000002
Enables subsequent open operations on a file or device to request write access. Otherwise, other processes cannot open the file or device if they request write access.
```

If this flag is not specified, but the file or device has been opened for write access or has a file mapping with write access, the function fails.

*Above, we discussed how sharing is enforced by the filesystem, but what if the filesystem doesn’t know that the file’s been modified?*

Like most user mode memory, the Memory Manager (MM) in the kernel may page-out portions of file mappings when it deems necessary, such as when the system needs more free physical memory. Both data and executable image mappings may be paged-out. Executable image sections can never modify the backing file, so they’re effectively treated as read-only with respect to the backing PE file. As mentioned before, image sections are copy-on-write, meaning any in-memory changes immediately create a private copy of the given page.

When the memory manager needs to page-out a page from an image section, it can use the following decision tree:
 - Never modified?  Discard it. We can read the contents back from the immutable file on disk.
 - Modified?  Save private copy it to the pagefile.
   - Example: If a security product hooks a function in ```ntdll.dll```, MM will create a private copy of each modified page. Upon page-out, private pages will be written to the pagefile.

If those paged-out pages are later touched, the CPU will issue a page fault and the MM will restore the pages.
 - Page never modified?  Read the original contents back from the immutable file on disk.
 - Page private?  Read it from the pagefile.

Note the following exception: The memory manager may treat PE-relocated pages as unmodified, dynamically reapplying relocations during page faults.


## Page hashes

Page hashes are a list of hashes of each 4KB page within a PE file. Since pages are 4KB, page faults typically occur on 4KB of data at a time. Full Authenticode verification requires the entire contiguous PE file, which isn’t available during a page fault. Page hashes allow the MM to validate hashes of individual pages during page faults.

There are two types of page hashes, which we’ve coined static and dynamic. Static page hashes are stored within a PE’s digital signature if the developer passes ```/ph``` to [```signtool```](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool). By pre-computing these, they are immediately available to the MM and CI upon module load.

CI can also compute them on-the-fly during signature validation, a mechanism we’re calling dynamic page hashes. Dynamic page hashes give CI flexibility to enforce page hashes even for files that were never signed with them.

Page hashes are not free - they use CPU and slow down page faults. They’re not used in most cases.


# Attacking code integrity

Imagine a scenario where a ransomware operator wants to ransom a hospital, so they send a phishing email to a hospital employee. The employee opens the email attachment and enables macros, running the ransomware. The ransomware employs a UAC bypass to immediately elevate to admin, then attempts to terminate any security software on the system so it can operate unhindered. Anti-Malware services run as [Protected Process Light](https://learn.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-) (PPL), protecting them from tampering by malware with admin rights, so the ransomware can’t terminate the Anti-Malware service.

If the ransomware could also run as a PPL, it could terminate the Anti-Malware product. The ransomware can’t launch itself directly as a PPL because UMCI prevents improperly-signed EXEs and DLLs from loading into PPL, as we discussed above. The ransomware might try to inject code into a PPL by modifying an EXE or DLL that’s already running, but the aforementioned **MmFlushImageSection** ensures in-use PE files remain immutable, so this isn’t possible.

We previously discussed how the filesystem is responsible for sharing checks. *What would happen if an attacker were to move the filesystem to another machine?*

[Network redirectors](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/what-is-a-network-redirector-) allow the use of network paths with any API that accepts file paths. This is very convenient, allowing users and applications to easily open and memory-map files over the network. Any resulting I/O is transparently redirected to the remote machine. If a program is launched from a network drive, the executable images for the EXE and its DLLs will be transparently pulled from the network.

When a network redirector is in use, the server on the other end of the pipe needn’t be a Windows machine. It could be a Linux machine running [Samba](https://en.wikipedia.org/wiki/Samba_(software)), or even a python [impacket script](https://github.com/fortra/impacket/blob/d71f4662eaf12c006c2ea7f5ec09b418d9495806/examples/smbserver.py) that “speaks” the [SMB network protocol](https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview). This means the server doesn’t have to honor Windows filesystem sharing semantics.

An attacker can employ a network redirector to modify a PPL’s DLL server-side, bypassing sharing restrictions. This means that PEs backing an executable image section are incorrectly assumed to be immutable. This is a class of vulnerability that we are calling **False File Immutability** (FFI).


## Paging exploitation

If an attacker successfully exploits False File Immutability to inject code into an in-use PE, wouldn’t page hashes catch such an attack?  The answer is: sometimes. If we look at the following table, we can see that page hashes are enforced for kernel drivers and Protected Processes, but not for PPL, so let’s pretend we’re an attacker targeting PPL.

| | Authenticode | Page hashes |
| ----- | ----- | ----- |
| Kernel drivers | ✅ | ✅ |
| Protected Processes (PP-Full) | ✅ | ✅ |
| Protected Process Light (PPL) | ✅ | ❌ |

Last year at Black Hat Asia 2023 ([abstract](https://www.blackhat.com/asia-23/briefings/schedule/#ppldump-is-dead-long-live-ppldump-31052), [slides](http://i.blackhat.com/Asia-23/AS-23-Landau-PPLdump-Is-Dead-Long-Live-PPLdump.pdf), [recording](https://www.youtube.com/watch?v=5xteW8Tm410)), we disclosed a vulnerability in the Windows kernel, showing how bad assumptions in paging can be exploited to inject code into PPL, defeating security features like [LSA](https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection) & [Anti-Malware Process Protection](https://learn.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-). The attack leveraged False File Immutability assumptions for DLLs in PPLs, as we just described, though we hadn’t yet named the vulnerability class.

![A diagram of the PPLFault exploit](/assets/images/false-file-immutability/image5.png)

Alongside the presentation, we released the [PPLFault exploit](https://github.com/gabriellandau/PPLFault) which demonstrates the vulnerability by dumping the memory of an otherwise-protected PPL. We also released the GodFault exploit chain, which combines the PPLFault Admin-to-PPL exploit with the AngryOrchard PPL-to-kernel exploit to achieve full read/write control of physical memory from user mode. We did this to motivate Microsoft to take action on a vulnerability that MSRC [declined to fix](https://www.elastic.co/security-labs/forget-vulnerable-drivers-admin-is-all-you-need) because it did not meet their [servicing criteria](https://www.microsoft.com/en-us/msrc/windows-security-servicing-criteria). Thankfully, the Windows Defender team at Microsoft stepped up, [releasing a fix](https://x.com/GabrielLandau/status/1757818200127946922) in February 2024 that enforces dynamic page hashes for executable images loaded over network redirectors, breaking PPLFault.


# New research

Above, we discussed Authenticode signatures embedded within PE files. In addition to embedded signatures, Windows supports a form of detached signature called a [security catalog](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/catalog-files). Security catalogs (.cat files) are essentially a list of signed authentihashes. Every PE with an authentihash in that list is considered to be signed by that signer. Windows keeps a large collection of catalog files in ```C:\Windows\System32\CatRoot``` which CI loads, validates, and caches.

![Simplified structure of a security catalog](/assets/images/false-file-immutability/image7.png)

![A security catalog rendered through Windows Explorer](/assets/images/false-file-immutability/image21.png)

A typical Windows system has over a thousand catalog files, many containing dozens or hundreds of authentihashes.

![Security catalogs on a Windows 11 23H2 system](/assets/images/false-file-immutability/image16.png)

To use a security catalog, Code Integrity must first load it. This occurs in a few discrete steps. First, CI maps the file into kernel memory using **ZwOpenFile**, **ZwCreateSection**, and **ZwMapViewOfSection**. Once mapped, it validates the catalog’s digital signature using **CI!MinCrypK_VerifySignedDataKModeEx**. If the signature is valid, it parses the hashes with **CI!I_MapFileHashes**.

![The Code Integrity catalog parsing process](/assets/images/false-file-immutability/image10.png)

Breaking this down, we see a few key insights. First, **ZwCreateSection(SEC_COMMIT)** tells us that CI is creating a data section, not an image section. This is important because there is no concept of page hashes for data sections.

Next, the file is opened without **FILE_SHARE_WRITE**, meaning write sharing is denied. This is intended to prevent modification of the security catalog during processing. However, as we have shown above, this is a bad assumption and another example of False File Immutability. It should be possible, in theory, to perform a PPLFault-style attack on security catalog processing.


## Planning the attack

![](/assets/images/false-file-immutability/image11.png)

The general flow of the attack is as follows:
 1. The attacker will plant a security catalog on a storage device that they control. They will install a symbolic link to this catalog in the ```CatRoot``` directory, so Windows knows where to find it.
 2. The attacker asks the kernel to load a malicious unsigned kernel driver.
 3. Code Integrity attempts to validate the driver, but it can’t find a signature or trusted authentihash, so it re-scans the CatRoot directory and finds the attacker’s new catalog.
 4. CI maps the catalog into kernel memory and validates its signature. This generates page faults which are sent to the attacker’s storage device. The storage device returns a legitimate Microsoft-signed catalog.
 5. The attacker empties the system working set, forcing all the previously-fetched catalog pages to be discarded.
 6. CI begins parsing the catalog, generating new page faults. This time, the storage device injects the authentihash of their malicious driver.
 7. CI finds the malicious driver’s authentihash in the catalog and loads the driver. At this point, the attacker has achieved arbitrary code execution in the kernel.


## Implementation and considerations

The plan is to use a PPLFault-style attack, but there are some important differences in this situation. PPLFault used an [opportunistic lock](https://learn.microsoft.com/en-us/windows/win32/fileio/opportunistic-locks) (oplock) to deterministically freeze the victim process’s initialization. This gave the attacker time to switch over to the payload and flush the system working set. Unfortunately, we couldn’t find any good opportunities for oplocks here. Instead, we’re going to pursue a probabilistic approach: rapidly toggling the security catalog between the malicious and benign versions.

![The catalog being toggled between benign and malicious versions; only one hash changes](/assets/images/false-file-immutability/image12.png)

The verification step touches every page of the catalog, which means all of those pages will be resident in memory when parsing begins. If the attacker changes the catalog on their storage device, it won’t be reflected in memory until after a subsequent page fault. To evict these pages from kernel memory, the attacker must empty the working set between **MinCrypK_VerifySignedDataKModeEx** and **I_MapFileHashes**.

This approach is inherently a race condition. There’s no built-in delays between signature verification and catalog parsing - it’s a tight race. We’ll need to employ several techniques to widen our window of opportunity.

Most security catalogs on the system are small, a few kilobytes. By choosing a large 4MB catalog, we can greatly increase the amount of time that CI spends parsing. Assuming catalog parsing is linear, we can choose an authentihash near the end of the catalog to maximize the time between signature verification and when CI reaches our tampered page. Further, we will create threads for each CPU on the system whose sole purpose is to consume CPU cycles. These threads run at higher priority than CI, so CI will be starved of CPU time. There will be one thread dedicated to repeatedly flushing pages from the system’s working set, and one thread repeatedly attempting to load the unsigned driver.

This attack has two main failure modes. First, if the payload Authentihash is read during the signature check, then the signature will be invalid and the catalog will be rejected.

![Code Integrity rejecting a tampered security catalog](/assets/images/false-file-immutability/image17.png)

Next, if an even number of toggles occur (including zero) between signature validation and parsing, then CI will parse the benign hash and reject our driver.

![Passing the signature check, but the benign catalog is parsed](/assets/images/false-file-immutability/image6.png)

The attacker wins if CI validates a benign catalog then parses a malicious one.

![Code Integrity validating a benign catalog, then parsing a malicious one](/assets/images/false-file-immutability/image20.png)


## Exploit demo

We named the exploit **ItsNotASecurityBoundary** as an homage to MSRC's [policy](https://www.microsoft.com/en-us/msrc/windows-security-servicing-criteria) that "Administrator-to-kernel is not a security boundary.”  The code is in GitHub [here](https://github.com/gabriellandau/ItsNotASecurityBoundary).

Demo video [here](https://drive.google.com/file/d/13Uw38ZrNeYwfoIuD76qlLgyXP8kRc8Nz/view?usp=sharing).


# Understanding these vulnerabilities

In order to properly defend against these vulnerabilities, we first need to understand them better.

A double-read (aka double-fetch) vulnerability can occur when victim code reads the same value out of an attacker-controlled buffer more than once. The attacker may change the value of this buffer between the reads, resulting in unexpected victim behavior.

Imagine there is a page of memory shared between two processes for an IPC mechanism. The client and server send data back and forth using the following struct. To send an IPC request, a client first writes a request struct into the shared memory page, then signals an event to notify the server of a pending request.

``` c
struct IPC_PACKET
{
    SIZE_T length;
    UCHAR data[];
};
```

A double-read attack could look something like this:

![An example of a double-read exploit using shared memory](/assets/images/false-file-immutability/image18.png)

First, the attacking client sets a packet’s structure’s length field to 16 bytes, then signals the server to indicate that a packet is ready for processing.  The victim server wakes up and allocates a 16-byte buffer using ```malloc(pPacket->length)```.  Immediately afterwards, the attacker changes the length field to 32.  Next, the victim server attempts to copy the packet’s contents into the the new buffer by calling ```memcpy(pBuffer, pPacket->data, pPacket->length)```, re-reading the value in ```pPacket->length```, which is now 32.  The victim ends up copying 32 bytes into a 16-byte buffer, overflowing it.

Double-read vulnerabilities frequently apply to shared-memory scenarios. They commonly occur in drivers that operate on user-writable buffers. Due to False File Immutability, developers need to be aware that their scope is actually much wider, and includes all files writable by attackers. Denying write sharing does not necessarily prevent file modification.


## Affected Operations

What types of operations are affected by False File Immutability?

| Operation | API | Mitigations |
| ----- | ----- | ----- |
| Image Sections | **CreateProcess** **LoadLibrary** | 1. Enable Page Hashes |
| Data Sections | **MapViewOfFile** **ZwMapViewOfSection** | 1. Avoid double reads\ 2. Copy the file to a heap buffer before processing\ 3. Prevent paging via MmProbeAndLockPages/VirtualLock |
| Regular I/O | **ReadFile** **ZwReadFile** | 1. Avoid double reads\  2. Copy the file to a heap buffer before processing |


## What else could be vulnerable?

Looking for potentially-vulnerable calls to **ZwMapViewOfSection** in the NT kernel yields quite a few interesting functions:

![Potentially-vulnerable uses of **ZwMapViewOfSection** within the NT kernel](/assets/images/false-file-immutability/image8.png)

If we expand our search to regular file I/O, we find even more candidates. An important caveat, however, is that **ZwReadFile** may be used for more than just files. Only uses on files (or those which could be coerced into operating on files) could be vulnerable.

![Potentially-vulnerable uses of **ZwReadFile** within the NT kernel](/assets/images/false-file-immutability/image14.png)

Looking outside of the NT kernel, we can find other drivers to investigate:

![Potentially-vulnerable uses of **ZwReadFile** in Windows 11 kernel drivers](/assets/images/false-file-immutability/image2.png)

![Potentially-vulnerable uses of **ZwMapViewOfSection** in Windows 11 kernel drivers](/assets/images/false-file-immutability/image1.png)


## Don’t forget about user mode

We’ve mostly been discussing the kernel up to this point, but it’s important to note that any user mode application that calls **ReadFile**, **MapViewOfFile**, or **LoadLibrary** on an attacker-controllable file, denying write sharing for immutability, may be vulnerable. Here’s a few hypothetical examples.


### MapViewOfFile

Imagine an application that is split into two components - a low-privileged worker process with network access, and a privileged service that installs updates. The worker downloads updates and stages them to a specific folder. When the privileged service sees a new update staged, it first validates the signature before installing the update. An attacker could abuse FFI to modify the update after the signature check.


### ReadFile

Since files are subject to double-read vulnerabilities, anything that parses complex file formats may be vulnerable, including antivirus engines and search indexers.


### LoadLibrary

Some applications rely on UMCI to prevent attackers from loading malicious DLLs into their processes. As we’ve shown with PPLFault, FFI can defeat UMCI.


# Stopping the exploit

Per their official servicing guidelines, MSRC won’t service Admin -> Kernel vulnerabilities by default. In this parlance, servicing means “fix via security update.”  This type of vulnerability, however, allows malware to bypass [AV Process Protections](https://learn.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-), leaving AV and EDR vulnerable to instant-kill attacks.

As a third-party, we can’t patch Code Integrity, so what can we do to protect our customers? To mitigate **ItsNotASecurityBoundary**, we created **FineButWeCanStillEasilyStopIt**, a filesystem minifilter driver that prevents Code Integrity from opening security catalogs over network redirectors. You can find it on GitHub [here](https://github.com/gabriellandau/ItsNotASecurityBoundary/tree/main/FineButWeCanStillEasilyStopIt). 

FineButWeCanStillEasilyStopIt has to jump through some hoops to correctly identify the problematic behavior while minimizing false positives. Ideally, CI itself could be fixed with a few small changes. Let’s look at what that would take.

![Fixing catalog processing by copying the catalog to the heap](/assets/images/false-file-immutability/image13.png)

As mentioned above in the Affected Operations section, applications can mitigate double-read vulnerabilities by copying the file contents out of the file mapping into the heap, and exclusively using that heap copy for all subsequent operations. The kernel heap is called the [pool](https://learn.microsoft.com/en-us/windows/win32/memory/memory-pools), and the corresponding allocation function is **ExAllocatePool**.

![Fixing catalog processing by locking the pages into RAM](/assets/images/false-file-immutability/image15.png)

An alternative mitigation strategy to break these types of exploits is to pin the pages of the file mapping into physical memory using an API such as **MmProbeAndLockPages**. This prevents eviction of those pages when the attacker empties the working set.


## End-user detection and mitigation

Fortunately, there is a way for end-users to mitigate this exploit without changes from Microsoft – Hypervisor Protected Code Integrity (HVCI). If HVCI is enabled, CI.dll doesn’t do catalog parsing at all. Instead, it sends the catalog contents to the Secure Kernel, which runs in a separate virtual machine on the same host. The Secure Kernel stores the received catalog contents in its own heap, from which signature validation and parsing are performed. Just like with the **ExAllocatePool** mitigation described above, the exploit is mitigated because file changes have no effect on the heap copy.

The probabilistic nature of this attack means that there are likely many failed attempts. Windows records these failures in the **Microsoft-Windows-CodeIntegrity/Operational** event log. Users can check this log for evidence of exploitation.

![**Microsoft-Windows-CodeIntegrity/Operational** event log showing an invalid driver signature](/assets/images/false-file-immutability/image23.png)

![**Microsoft-Windows-CodeIntegrity/Operational** event log showing an invalid security catalog](/assets/images/false-file-immutability/image4.png)


# Disclosure

The disclosure timeline is as follows:
 - 2024-02-14: We reported ItsNotASecurityBoundary and FineButWeCanStillEasilyStopIt to MSRC as VULN-119340, suggesting **ExAllocatePool** and **MmProbeAndLockPages** as simple low-risk fixes
 - 2024-02-29: The Windows Defender team reached out to coordinate disclosure
 - 2024-04-23: Microsoft releases [KB5036980](https://support.microsoft.com/en-us/topic/april-23-2024-kb5036980-os-builds-22621-3527-and-22631-3527-preview-5a0d6c49-e42e-4eb4-8541-33a7139281ed) Preview with the **MmProbeAndLockPages** fix
 - 2024-05-14: Fix reaches GA for Windows 11 23H2 as [KB5037771](https://support.microsoft.com/en-us/topic/may-14-2024-kb5037771-os-builds-22621-3593-and-22631-3593-e633ff2f-a021-4abb-bd2e-7f3687f166fe); we have not tested any other platforms (Win10, Server, etc).
 - 2024-06-14: MSRC closed the case, stating "We have completed our investigation and determined that the case doesn't meet our bar for servicing at this time. As a result, we have opened a next-version candidate bug for the issue, and it will be evaluated for upcoming releases. Thanks, again, for sharing this report with us."


# Fixing Code Integrity

Looking at the original implementation of **CI!I_MapAndSizeDataFile**, we can see the legacy code calling **ZwCreateSection** and **ZwMapViewOfSection**:

![The vulnerable **CI!I_MapAndSizeDataFile** implementation](/assets/images/false-file-immutability/image22.png)

Contrast that with the new **CI!CipMapAndSizeDataFileWithMDL**, which follows that up with **MmProbeAndLockPages**:

![The new **CI!CipMapAndSizeDataFileWithMDL** has a mitigation](/assets/images/false-file-immutability/image3.png)


# Summary and conclusion

Today we discussed and named a bug class: **False File Immutability**. We are aware of two public exploits that leverage it, PPLFault and ItsNotASecurityBoundary.

[PPLFault](https://github.com/gabriellandau/PPLFault): Admin -> PPL [-> Kernel via GodFault]
 - Exploits bad immutability assumptions about image section in CI/MM
 - Reported September 2022
 - Patched February 2024 (~510 days later)

[ItsNotASecurityBoundary](https://github.com/gabriellandau/ItsNotASecurityBoundary): Admin -> Kernel
 - Exploits bad immutability assumptions about data sections in CI
 - Reported February 2024
 - Patched May 2024 (~90 days later)

If you are writing Windows code that operates on files, you need to be aware of the fact these files may be modified while you are working on them, even if you deny write sharing. See the Affected Operations section above for guidance on how to protect yourselves and your customers against these types of attacks.

ItsNotASecurityBoundary is not the end of FFI. There are other exploitable FFI vulnerabilities out there. My colleagues and I at Elastic Security Labs will continue exploring and reporting on FFI and beyond. We encourage you to follow along on X [@GabrielLandau](https://x.com/GabrielLandau) and [@ElasticSecLabs](https://x.com/elasticseclabs).
