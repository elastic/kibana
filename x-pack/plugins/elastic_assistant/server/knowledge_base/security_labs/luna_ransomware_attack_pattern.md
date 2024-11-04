---
title: "LUNA Ransomware Attack Pattern Analysis"
slug: "luna-ransomware-attack-pattern"
date: "2022-08-31"
subtitle: "LUNA attack pattern and malware observations"
description: "In this research publication, we'll explore the LUNA attack pattern — a cross-platform ransomware variant."
author:
  - slug: salim-bitam
  - slug: seth-goodwin
  - slug: andrew-pease
  - slug: daniel-stepanic
image: "dark-side-of-moon-flickr-earth-shine-thumbnail.jpeg"
category:
  - slug: attack-pattern
tags:
  - luna
  - ref5264
---

## Key Takeaways

- LUNA is ransomware that achieves cross-platform capabilities through its development in Rust
- The Windows capabilities are comparable to other ransomware peers
- The Linux capabilities, while functional, are less elegant than the Windows variant

## Preamble

LUNA Ransomware, which Elastic tracks as REF5264, is a Rust-based ransomware first identified by Kaspersky in [their report](https://securelist.com/luna-black-basta-ransomware/106950/) introducing it in July 2022. Rust as a programming language is known in the developer community for being simpler to implement cross-platform software to work on various target operating systems. It’s able to do this through a convenient cluster of tools that abstract away some operating system peculiarities, likely allowing the malware author to focus more on core functionality.

From the Kaspersky report we were able to collect two LUNA Ransomware samples: (1) a Linux ELF binary, and (2) a Windows PE executable.

This research covers:

- Execution and behavior of each sample
- Description of the encryption mechanism
- Comparison across our samples
- Comparison to other ransomware
- Detection opportunities

## Execution Chain

In the following sections, we'll describe both the Linux and Windows execution chains.

### Linux execution

Our Linux sample required an argument to execute. The options were **-file [file]** to encrypt a single file, or **-dir [directory]** to walk and encrypt the contents of a specified directory and drop a ransom note. If executed with no arguments, Linux LUNA returns a help page with instructions to use one of the two available arguments. If executed with both the **-file** and **-dir** arguments (including multiple files or directories), all arguments are used.

![LUNA instructions](/assets/images/luna-ransomware-attack-pattern/image7.jpg)

There are no functional protections against encrypting system directories or files. We were able to demonstrate this through encryption of **/etc**. The execution loop continued as expected until it encrypted the **shadow** and **sudoers** files and the process was unable to verify privileges for further file access. The test machine then became unresponsive and required reverting to a prior snapshot. Encryption of these critical system files prevents further encrypting of privileged files and directories the malware attempts to access.

![LUNA ransomware flow for Linux](/assets/images/luna-ransomware-attack-pattern/image12-1.jpg)

![LUNA functions for Linux](/assets/images/luna-ransomware-attack-pattern/image10.jpg)

All encrypted files are appended with a **.Luna** extension, i.e. **/etc/passwd.Luna**. If using the **-dir** flag, a **r\*\*** eadme-Luna.txt **ransom note will be created at the root of each encrypted directory as well as subdirectories such as** /etc/readme-Luna.txt **and** /etc/ssl\readme-Luna.txt **. While there are no ransomware notes dropped when encrypting an individual file using the** -file **flag, the encrypted file is still appended with the**.Luna\*\* extension.

> You may notice the backslash instead of a forward slash in the above full path **/etc/ssl\readme-Luna.txt**. This is an interesting artifact of LUNA hardcoding a \*\*\*\* to append to subdirectories when building the full path for the ransom note. This behavior is expected and would go unnoticed in a Windows environment, but drew our attention when we saw it in Linux. It does not appear to hinder functionality.

![Hardcoded backslash in LUNA for Linux](/assets/images/luna-ransomware-attack-pattern/image6.jpg)

The ransom note is embedded in the binary in a Base64 format and placed in the root of the targeted directories.

![LUNA ransom note for Linux](/assets/images/luna-ransomware-attack-pattern/image19.jpg)

The ransom note contains grammatical and spelling errors, listing two ProtonMail email addresses. ProtonMail is an end-to-end encrypted email service based in Switzerland. ProtonMail is popular with privacy-minded individuals and organizations because it uses client-side encryption to protect email content and user data before they are sent to ProtonMail servers.

The phrase “All your files were moved to secure storage” may be either a translation error for “encrypted” or an attempt to trick the victim into believing their data has been encrypted and stolen to later be used for extortion. This could also refer to some operation that is to occur before encryption takes place. There is no network connectivity aspect of this malware.

There is a threat of extortion with the phrase “we can show your real face”, but no extortion site has been observed as other extortion activity groups, like [CUBA Ransomware](https://www.elastic.co/security-labs/cuba-ransomware-malware-analysis), have used.

#### Linux Exclusions

Our Linux LUNA sample includes functional but largely unnecessary exclusions leftover from the Windows implementation. These checks are performed in the **-dir** execution flow before a file is sent to the **add_file** function for encryption. As an example, see the **.ini** , **.exe** , **.dll** , and **.lnk** extensions and **OpenServer** , **Windows** , **Program Files** , **Recycle.Bin** , **ProgramData** , **AppData** , and the **All Users** directories below. Of note, while the **.Luna** extension is included in the vestigial exclusions, it is present in both Windows and Linux.

![Windows File Extension Exclusions within the Linux sample](/assets/images/luna-ransomware-attack-pattern/image20-2.jpg)

![Windows Folder Exclusions in the Linux sample](/assets/images/luna-ransomware-attack-pattern/image21-2.jpg)

|                           |                                                                      |
| ------------------------- | -------------------------------------------------------------------- |
| File Extension Exclusions | Folder Exclusions                                                    |
| .Luna.ini.exe.dll.lnk     | OpenServerWindowsProgram FilesRecycle.BinProgramDataAppDataAll users |

Linux LUNA checks for Windows file extensions and folders and will not encrypt files with the specified extensions on a Linux victim.

![Folder directory with Windows extensions before execution](/assets/images/luna-ransomware-attack-pattern/image17.jpg)

![Folder directory with Windows extensions after execution](/assets/images/luna-ransomware-attack-pattern/image5.jpg)

The check for the **.Luna** extension is useful in that it prevents re-encrypting an already encrypted file.

### Windows execution

The Windows sample we found was a more full-featured product that included much of the functionality present in other mature ransomware families. It still includes the **-dir** and **-file** flags, but now if the malware is run without arguments, the Windows LUNA will perform some preliminary defense evasion, file protection preparation, and enumeration measures before entering the **-dir** execution loop. Additionally within the **-dir** execution flow Windows LUNA file and directory exclusions are functional and serve to protect critical system processes from being corrupted by encryption. This is different from what was observed with the Linux LUNA implementation which does not exclude sensitive OS directories or files that can impact system stability.

![LUNA ransomware flow for Windows](/assets/images/luna-ransomware-attack-pattern/image12.png)

![LUNA functions for Windows](/assets/images/luna-ransomware-attack-pattern/image9.jpg)

LUNA uses service and process termination to de-conflict any files locked by other programs to successfully encrypt them along with disabling security products that may prevent ransomware execution. It does this by leveraging a built-in Rust process builder ( **std::sys::windows::process::Command::new** ) to call three new processes with their own pre-defined command-line arguments.

- Service Control
- Net
- TaskKill

#### Service Control

[Service Control](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/sc-config) is a Windows utility used to modify services’ entries in the registry and in the Service Control Manager database. In this case, it’s used to ensure a service that is stopped cannot be restarted and interrupt malware execution.

![Service Control disabling security products](/assets/images/luna-ransomware-attack-pattern/image4.jpg)

- **"C:\WINDOWS\system32\sc.exe" config [service] start=disabled**
  - **"C:\WINDOWS\system32\sc.exe"** : Service Control executable
  - **config [service]**: Specifies the service (as an example, WinDefend) that will be modified
  - **start=disabled** : Sets the start type of the service to “disabled”

LUNA does not check that a service exists before issuing the service disable command. So it will commonly get [1060 errors](https://docs.microsoft.com/en-us/windows/win32/debug/system-error-codes--1000-1299-#ERROR_SERVICE_DOES_NOT_EXIST) to the console indicating that **sc.exe** attempted to modify a service that does not exist.

![Service Control generating code 1060 errors](/assets/images/luna-ransomware-attack-pattern/image22.jpg)

Our LUNA sample attempts to disable 253 different services. See the Appendix: Windows Services Termination List for the complete list.

#### Net

[Net](https://attack.mitre.org/software/S0039/) ( **net.exe** ) is a Windows utility used in command-line operations for the control of users, groups, services, and network connections. In this case, it is used to stop the running services that have already been prevented from restarting by **sc.exe**.

![Net disabling security products](/assets/images/luna-ransomware-attack-pattern/image18.jpg)

- **"C:\WINDOWS\system32\net.exe" stop [service] /y**
  - **"C:\WINDOWS\system32\net.exe"** : Net executable
  - **stop [service]**: Specifies the name of the service (as an example, WinDefend) that will be stopped
  - **/y** : Carries out the command without first prompting to confirm actions

Again there are no checks that the service is actually running on the victim machine. For Net, this manifests as **2185** errors printing to the console for each attempt to stop a nonexistent service.

![Net generating code 2185 errors](/assets/images/luna-ransomware-attack-pattern/image13.jpg)

#### TaskKill

[TaskKill](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill) ( **taskkill.exe** ) is a Windows utility used to end a task or process by the process ID or image name. LUNA uses TaskKill to terminate processes by name that could interfere with the malware’s operation by maintaining file access locks on files targeted for encryption.

![TaskKill disabling security products](/assets/images/luna-ransomware-attack-pattern/image11.jpg)

- **"C:\WINDOWS\system32\taskkill.exe" /im [process name] /f**
  - **"C:\WINDOWS\system32\taskkill.exe"** : TaskKill executable
  - **/im [process name]**: Specifies the name of the process (as an example, msmpeng.exe) that will be terminated
  - **/f** : Specifies that processes be forcefully ended

Once again, there are no checks that the process is actually running. TaskKill produces “process not found” errors printed to the console for attempts to kill non-existent processes.

![TaskKill generating errors codes](/assets/images/luna-ransomware-attack-pattern/image3.jpg)

Our sample contained a hardcoded list of 997 processes to kill. See the Appendix: Windows Process Termination List for the complete list.

#### Disk enumeration

Next, Windows LUNA executed with no arguments uses a function called **get_all_drives** to brute-force the enumeration of all the available drives by going through the English alphabet and verifying if the drives are mapped to the machine using Rust library **std::fs::read_dir**. If the volume exists, it will be flagged for encryption at a later stage.

![LUNA identifying volumes for encryption](/assets/images/luna-ransomware-attack-pattern/image14.jpg)

All volumes identified are then passed to LUNA’s **walk_dir** function that will drop ransom notes, enumerate subdirectories, and encrypt files similar to the Linux version with the exact same ransomware note.

![LUNA ransom note for Windows](/assets/images/luna-ransomware-attack-pattern/image8.jpg)

#### Windows exclusions

Unlike the Linux version, however, the Windows LUNA file and folder exclusions are respected to prevent making the targeted machine inoperable or inadvertently stopping encryption prematurely.

|                           |                                                                      |
| ------------------------- | -------------------------------------------------------------------- |
| File Extension Exclusions | Folder Exclusions                                                    |
| .Luna.ini.exe.dll.lnk     | OpenServerWindowsProgram FilesRecycle.BinProgramDataAppDataAll users |

We compared these exclusions with those from our [CUBA Ransomware Malware Analysis](https://www.elastic.co/security-labs/cuba-ransomware-malware-analysis#excluded-directories) report. LUNA did not include the file extensions **.sys** or **.vbm** , both identified in the CUBA analysis. Also, LUNA excludes all of the **\Program Files** , **\ProgramData** , and **\AppData** directories and subdirectories, which CUBA encrypts - or has narrower exclusions to subfolders. This seems like an overly broad exclusion methodology as it misses some valuable data that would be disruptive if encrypted.

## Encryption Implementation

LUNA uses a multi-step encryption implementation approach designed to make the author’s decryption tool the only known way to recover targeted files.

### Encryption process

The malware author generates a public/private key pair before compilation and embeds the public key in the LUNA binary for later use by the malware. The author maintains the private key until the victim has met their demands.

![Author generates key pair](/assets/images/luna-ransomware-attack-pattern/image1-8.jpg)

> In many cases, ransomware actors generate a new “author’s” key pair for each victim organization.

Within the **add_file** function, each time LUNA encounters a new file to encrypt, the malware will generate its own public/private key pair associated with that file. It does this by using the open source library [x25519-dalek](https://github.com/dalek-cryptography/x25519-dalek) x25519 elliptic curve Diffie-Hellman key exchange with [**RngCore::fill_bytes**](https://docs.rs/rand/latest/rand/trait.RngCore.html#tymethod.fill_bytes) random number generator used for entropy, which is built into Rust.

![LUNA generates key pair](/assets/images/luna-ransomware-attack-pattern/image1-3.jpg)

> Elliptic curve ([ECC](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography)) key generation offers several performance improvements over [RSA](<https://en.wikipedia.org/wiki/RSA_(cryptosystem)>) for equivalent key size. Generally, for a given key size ECC offers greater cryptographic strength and is faster to derive a public key from a private key. This speed improvement helps when a new key pair is generated for every file to be encrypted on a victim machine.

At this point, there are two sets of public/private keys: the authors and the malware’s.

LUNA will then use the malware-generated private key and the author’s embedded public key to derive an AES key.

![LUNA creates AES key](/assets/images/luna-ransomware-attack-pattern/image1-4.jpg)

Files can then be encrypted by chunk with AES in the counter (CTR) mode and an initialization vector (IV). The hardcoded IV is the string “Luna” padded with zeros to be 16 bytes long as required by the AES-CTR cipher algorithm.

![LUNA encrypts using the AES key](/assets/images/luna-ransomware-attack-pattern/image1-5.jpg)

> [Initialization vectors](https://en.wikipedia.org/wiki/Initialization_vector) are broadly used in cryptography to provide input to initialize the state of the cipher algorithm before the plaintext is encrypted. In most other contexts it is randomized and shared with the public key. This randomization provides a similar function to [salt](<https://en.wikipedia.org/wiki/Salt_(cryptography)>) for hashed passwords.

Using the **std::io::Seek** trait, Rust is able to abstract the OS appropriate **seek** , ie **lseek** for Linux. The malware uses this function to read data from the target file, encrypt it, and write it back to the original file.

LUNA first overwrites the original file with the encrypted content, then appends the malware’s public key created for that file and the string “Luna” as a file marker. The extension **.Luna** is then added to the filename.

![Adding .Luna to the filename](/assets/images/luna-ransomware-attack-pattern/image15.jpg)

![LUNA public key appended to the encrypted file](/assets/images/luna-ransomware-attack-pattern/image1-6.jpg)

At this point, the AES and malware’s private keys are no longer needed and must be destroyed so only the author’s private key can be used for decryption.

LUNA then moves to the next file and starts again.

### Decryption process

In order to decrypt a file encrypted with this method we need the AES key and the IV. The IV is hardcoded into the malware and already known, however, the AES key is discarded once the file is encrypted. The AES key was initially generated using the malware’s private key and the author’s public key, but the malware’s private key has also been discarded.

While we also have the malware’s public key in the encrypted file itself, the author’s private key is required, in combination with the malware's public key, to derive the AES key. The AES key in combination with the hardcoded IV can then be used to decrypt each encrypted chunk.

![Decryption process](/assets/images/luna-ransomware-attack-pattern/image1-7.jpg)

Below you can see a graphic outlining the encryption and decryption process of the LUNA ransomware.

![Encryption/decryption process overview](/assets/images/luna-ransomware-attack-pattern/image1.jpg)

### Chunk encryption

Like many ransomware families, LUNA encrypts files differently based on size. This serves to enhance performance and allows the ransomware to make a larger volume of data unusable in a shorter period of time.

If the file is smaller than **320** kB the entire contents of the file are encrypted using the above-described method. If the file size is between **320** kB and approximately **3** MB then only the first **320** kB will be encrypted. For files larger than approximately **3** MB LUNA will encrypt **320** kB chunks deriving the space between chunks by a byte value calculated at run-time based on the file size.

### LUNA encryption POC

If you're interested in trying this out yourself to see the encryption/decryption process in action, check out Elastic's Malware Analysis and Reverse Engineering (MARE) team's Python POC in the LUNA Encryption POC Appendix. This script illustrates the implementation of the LUNA encryption/decryption mechanism.

![LUNA encryption POC](/assets/images/luna-ransomware-attack-pattern/image16.jpg)

## Summary

The samples were nearly identical in their core functionality of the -dir and -file execution paths, the encryption mechanisms utilized, and hard-coded values. Hardcoded value similarities include:

- Extension exclusion values
- Folder exclusion values
- Initialization vector
- Author’s public key
- Ransomware note

The most obvious difference between the two LUNA samples we looked at is the enhanced functionality of the Windows PE sample when provided no arguments and the adherence to the extension and folder exclusions for Windows.

There are many differences between the two OS packages; it is probably more convenient to provide a single decryption tool for all endpoints ransomed, irrespective of the OS. A uniform encryption and decryption framework could indicate that the LUNA ransomware is used in a [Ransomware-as-a-Service](https://www.trendmicro.com/vinfo/us/security/definition/ransomware-as-a-service-raas) implementation or that LUNA is provided as a kit that can be tailored to specific campaigns.

These differences and similarities lead us to the following assessments of these samples:

1. The Windows sample is much more mature than the Linux sample as reflected in the drive enumeration, services disable/stop, process termination, and exclusions employed to enable the malware to be deployed broadly with little detailed knowledge of the victim machines.
2. The Linux sample contains vestigial Windows features. The exclusions could be modified to fit some specific Linux distributions, but it could be a challenge to create one list that has broad coverage in the diverse Linux ecosystem.
3. The service disable/stop and process terminate lists are very large when compared to other mature ransomware samples. While it does not impede the encryption function of the malware, it generates a tremendous amount of noise that could alert defenders. Calling **sc config [service] start=disabled** and **net stop** 253 times for many services that do not exist, or **taskkill /im** 997 times for processes that do not exist provides an excellent opportunity to interdict ransomware execution before encryption begins. This would be much quieter with prior service and process enumeration, as is common with other ransomware campaigns.
4. The Linux sample did not include the safeguards built into the Windows variant. This caused the Linux sample to encrypt files needed to validate entitlements to system files, such as the **sudoers** and **passwd** files. Possibilities, why the Linux sample did not include safeguards :

   1. the malware authors did not have a firm enough understanding of Linux system files and directories to know what should be excluded;
   2. a time constraint prevented the completion of a mature Linux sample;
   3. a lack of widely available ransomware exclusions lists for Linux;
   4. inclusion of a Linux sample was opportunistic because the sample was developed in Rust, which is cross-platform; or
   5. Linux capabilities were included as a “selling point” for a Ransomware-as-a-Service offering

## Observed Adversary Tactics and Techniques

### Tactics

Using the MITRE ATT&CK® framework, tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

- [Discovery](https://attack.mitre.org/tactics/TA0007)
- [Defense Evasion](https://attack.mitre.org/tactics/TA0005)
- [Impact](https://attack.mitre.org/tactics/TA0040)

### Techniques / sub techniques

Techniques and Sub techniques represent how an adversary achieves a tactical goal by performing an action.

Observed techniques/sub techniques:

- [Indicator Removal on Host](https://attack.mitre.org/techniques/T1070/)
- [File and Directory Discovery](https://attack.mitre.org/techniques/T1083)
- [System Service Discovery](https://attack.mitre.org/techniques/T1007/)
- [Data Encrypted for Impact](https://attack.mitre.org/techniques/T1486)

## Detections

Our detection/protection philosophy regarding ransomware focuses on pre-encryption detection when defenders still have an opportunity to interdict malware execution before data is lost.

### YARA

For LUNA Windows and Linux variants, the [YARA rule below](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Multi_Ransomware_Luna.yar) detects strings embedded in the malware and byte sequences related to core functionality.

```
rule Multi_Ransomware_LUNA {
    meta:
        Author = “Elastic Security”
        creation_date = "2022-08-02"
        os = "Linux, Windows"
        arch = "x86"
        category_type = "Ransomware"
        family = "LUNA"
        threat_name = "Multi.Ransomware.LUNA"
        reference_sample = "1cbbf108f44c8f4babde546d26425ca5340dccf878d306b90eb0fbec2f83ab51"
    strings:
        $str_extensions = ".ini.exe.dll.lnk"
        $str_ransomnote_bs64 = "W1dIQVQgSEFQUEVORUQ/XQ0KDQpBbGwgeW91ciBmaWxlcyB3ZXJlIG1vdmVkIHRvIHNlY3VyZSBzdG9yYWdlLg0KTm9ib"
        $str_path = "/home/username/"
        $str_error1 = "Error while writing encrypted data to:"
        $str_error2 = "Error while writing public key to:"
        $str_error3 = "Error while renaming file:"
        $chunk_calculation0 = { 48 8D ?? 00 00 48 F4 48 B9 8B 3D 10 B6 9A 5A B4 36 48 F7 E1 48 }
        $chunk_calculation1 = { 48 C1 EA 12 48 89 D0 48 C1 E0 05 48 29 D0 48 29 D0 48 3D C4 EA 00 00 }
    condition:
        5 of ($str_*) or all of ($chunk_*)
}
```

### Endpoint rules

For Windows LUNA there is the opportunity to prevent execution before encryption in the “no arguments” execution flow. As outlined in the previous sections, this execution flow attempts to disable and stop 253 services and terminate 997 processes whether or not they exist on the victim machine.

Our Threat Research And Detection Engineering team (TRADE) tuned and promoted [a behavioral endpoint rule](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_attempt_to_disable_windows_defender_services.toml) targeting these pre-encryption environmental preparation TTPs.

The below rule identifies and prevents attempts to disable the Windows Defender services.

```
query = '''
process where event.action == "start" and
  process.pe.original_file_name : ("net.exe", "sc.exe", "cmd.exe") and
  process.command_line : ("*disabled*", "*stop*") and process.command_line : ("*WdNisSvc*", "*WinDefend*") and
    (process.parent.executable :
                    ("?:\\Windows\\Microsoft.NET\\*",
                     "?:\\Users\\*",
                     "?:\\ProgramData\\*") or
    process.parent.name : ("rundll32.exe", "regsvr32.exe", "wscript.exe", "cscript.exe", "powershell.exe", "mshta.exe"))
'''

optional_actions = []
[[actions]]
action = "kill_process"
field = "process.entity_id"
state = 0
```

## References

The following were referenced throughout the above research:

- [https://securelist.com/LUNA-black-basta-ransomware/106950/](https://securelist.com/luna-black-basta-ransomware/106950/)
- [https://www.virustotal.com/gui/file/1cbbf108f44c8f4babde546d26425ca5340dccf878d306b90eb0fbec2f83ab51](https://www.virustotal.com/gui/file/1cbbf108f44c8f4babde546d26425ca5340dccf878d306b90eb0fbec2f83ab51/)
- [https://www.virustotal.com/gui/file/ad8d568811e05e12cde78f76c3b7cbbde0d20aee5b4e918a3a8d515f5e242bb6](https://www.virustotal.com/gui/file/ad8d568811e05e12cde78f76c3b7cbbde0d20aee5b4e918a3a8d515f5e242bb6)

## Appendix

### LUNA encryption POC

We are providing an encryption POC, written in Python, that mimics and visualizes the encryption implementation of the LUNA ransomware.

Note: like LUNA, each time the script is run, the encrypted output will be different because the private keys are generated each time.

**Prerequisites:**

- Pyton 3
- **cryptography** and **termcolor** Python modules

**Usage:**

- Save the below script as **luna_encryption_poc.py**
- install the dependencies with **pip install --user cryptography termcolor**
- execute the script with **python luna_encryption_poc.py**

```
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.asymmetric import x25519

from termcolor import colored

# Malware author generates public key and embeds into malware, keeps private key for decryption later
author_private_key = x25519.X25519PrivateKey.generate()         # Unknown author's priv_key generation method
author_embedded_public_key = author_private_key.public_key()

# Malware generates key pair
malware_private_key = x25519.X25519PrivateKey.generate()
malware_public_key = malware_private_key.public_key()

# Serialization of malware pub_key
malware_public_bytes = malware_public_key.public_bytes(encoding=serialization.Encoding.Raw,
  format=serialization.PublicFormat.Raw)
print("Malware Public Key:  ", colored(malware_public_bytes.hex(), "blue"))

# AES key generated by malware's private key and author's embedded public key
# malware_private_key is discarded after this step and not needed for decryption
shared_key_generated = malware_private_key.exchange(author_embedded_public_key)
print("Generated Shared Key (AES): " + colored(shared_key_generated.hex(), "cyan"))

# Encryption Step with AES + IV null-padded LUNA string
iv = bytearray(b'4c756e6100000000')                             # 'Luna....' 16 bytes sized needed for AES CTR

# AES stream cipher (CTR) created using AES shared key and IV
cipher = Cipher(algorithms.AES(shared_key_generated), modes.CTR(iv))
encryptor = cipher.encryptor()

# String to be encrypted
plaintext = b"You know, for search!"
print("Plaintext: ", colored(plaintext, "green"))
print("Plaintext.hex(): ", colored(plaintext.hex(), "green"))

# Encryption of string using AES stream cipher
ct = encryptor.update(plaintext) + encryptor.finalize()

# Mock encrypted file with cipher text + public bytes + file marker
file_marker = b"Luna"                                           # 0x4c756e61
encrypted_file = ct + malware_public_bytes + file_marker

file_ciphertext = encrypted_file[:-36]
pub_key_from_encrypted_file = encrypted_file[-36:-4]
file_marker_from_encrypted_file = encrypted_file[-4:]

print("Encrypted File contents: \n",
    colored(file_ciphertext.hex(), "red"),
    colored(pub_key_from_encrypted_file.hex(), "blue"),
    colored(file_marker_from_encrypted_file.hex(), "yellow"))
print("\t",
    colored("Encrypted content", "red"), "        ",
    colored("Embedded malware's pub_key", "blue"), "       ",
    colored("Embedded file marker", "yellow"))

# Serialization
malware_public_key_from_file = x25519.X25519PublicKey.from_public_bytes(pub_key_from_encrypted_file)

# AES key derived from author's private key and malware embedded public key
shared_key_derived = author_private_key.exchange(malware_public_key_from_file)
print("Derived Shared Key (AES): ", colored(shared_key_derived.hex(), "cyan"))

# Decryption using derived AES shared key and IV
redo_cipher = Cipher(algorithms.AES(shared_key_derived), modes.CTR(iv))
decryptor = redo_cipher.decryptor()
result = decryptor.update(file_ciphertext) + decryptor.finalize()
print("Decrypted plaintext: ", colored(result, "green"))
```

This Python script will display the malware public key, the shared AES key, the plain text as a string, the plain text as a hex value, the encrypted text, and finally decrypt the encrypted text back into the original plain text as a string.

![LUNA encryption POC output](/assets/images/luna-ransomware-attack-pattern/image2.jpg)

### Windows services termination list

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acronis VSS ProviderAcronisAgentAcrSch2SvcAdobeARMserviceAlerterARSMaswBccavbackupBackupExecAgentAcceleratorBackupExecAgentBrowserBackupExecDeviceMediaServiceBackupExecJobEngineBackupExecManagementServiceBackupExecRPCServiceBackupExecVSSProviderbcrservicebedbgBITSBlueStripeCollectorBrokerInfrastructureccEvtMgrccSetMgrCissesrvCpqRcmc3CSAdminCSAuthCSDbSyncCSLogCSMonCSRadiusCSTacacsDB2DB2-0DB2DAS00DB2GOVERNOR_DB2COPY1DB2INST2DB2LICD_DB2COPY1DB2MGMTSVC_DB2COPY1DB2REMOTECMD_DB2COPY1DCAgentEhttpSrvekrnEnterprise Client Serviceepag EPIntegrationService EPProtectedService epredline EPSecurityServiceEPSecurityService EPUpdateServiceEPUpdateService EraserSvc11710ERSvcEsgShKernelESHASRVEventlogFA_SchedulerGoogleChromeElevationServicegupdategupdatemHealthServiceIBMDataServerMgrIBMDSServer41IDriverTIISAdminIMAP4SvcImapiServiceklnagentLogProcessorServiceLRSDRVXmacmnsvcmasvcMBAMServiceMBEndpointAgentMcShieldMcTaskManagermfefiremfemmsmfevtpmfewcMMSMozyprobackupMsDtsServerMsDtsServer100MsDtsServer110 | MsDtsServer130MSExchangeESMSExchangeISMSExchangeMGMTMSExchangeMTAMSExchangeSAMSExchangeSRSmsftesql$PRODMSMQ MSOLAP$SQL_2008MSOLAP$SYSTEM\_BGCMSOLAP$TPSMSOLAP$TPSAMAMSSQL$BKUPEXECMSSQL$CITRIX\_METAFRAMEMSSQL$ECWDB2MSSQL$EPOSERVERMSSQL$ITRISMSSQL$NET2MSSQL$PRACTICEMGTMSSQL$PRACTTICEBGCMSSQL$PRODMSSQL$PROFXENGAGEMENTMSSQL$SBSMONITORINGMSSQL$SHAREPOINTMSSQL$SQL_2008MSSQL$SQLEXPRESSMSSQL$SYSTEM_BGCMSSQL$TPSMSSQL$TPSAMAMSSQL$VEEAMSQL2008R2MSSQL$VEEAMSQL2012MSSQLFDLauncherMSSQLFDLauncher$ITRISMSSQLFDLauncher$PROFXENGAGEMENTMSSQLFDLauncher$SBSMONITORINGMSSQLFDLauncher$SHAREPOINTMSSQLFDLauncher$SQL\_2008MSSQLFDLauncher$SYSTEM_BGCMSSQLFDLauncher$TPSMSSQLFDLauncher$TPSAMAMSSQLLaunchpad$ITRISMSSQLSERVERMSSQLServerADHelperMSSQLServerADHelper100MSSQLServerOLAPServicemsvsmon90MySQL57Net2ClientSvcNetDDENetMsmqActivatorNetSvcNimbusWatcherServiceNtLmSspNtmsSvcntrtscanodservOracleClientCache80osePDVFSServicePOP3SvcProLiantMonitorReportServerReportServer$SQL_2008ReportServer$SYSTEM\_BGCReportServer$TPSReportServer$TPSAMARESvcRSCDsvcsacsvrSamSsSAVServiceSDD_ServiceSDRSVCSentinelAgentSentinelHelperServiceSentinelStaticEngineSepMasterServiceSepMasterServiceMigShMonitorSmcinstSmcServiceSMTPSvcSNAC | SnowInventoryClientSntpServiceSQL BackupsSQLAgent$BKUPEXECSQLAgent$CITRIX_METAFRAMESQLAgent$CXDBSQLAgent$ECWDB2SQLAgent$EPOSERVERSQLAgent$ITRISSQLAgent$NET2SQLAgent$PRACTTICEBGCSQLAgent$PRACTTICEMGTSQLAgent$PRODSQLAgent$PROFXENGAGEMENTSQLAgent$SBSMONITORINGSQLAgent$SHAREPOINTSQLAgent$SQL_2008SQLAgent$SQLEXPRESSSQLAgent$SYSTEM_BGCSQLAgent$TPSSQLAgent$TPSAMASQLAgent$VEEAMSQL2008R2SQLAgent$VEEAMSQL2012SQLBrowserSQLsafe Backup ServiceSQLsafe Filter ServiceSQLSafeOLRServiceSQLSERVERAGENTSQLTELEMETRYSQLTELEMETRY$ECWDB2SQLTELEMETRY$ITRISSQLWriterSSISTELEMETRY130SstpSvcsvcGenericHostswi_filterswi_serviceswi_updateswi_update_64SymantecSymantec System RecoverysysdownSystemTelemetryserverTlntSvrTmCCSFtmlistenTmPfw tpautoconnsvcTPVCGatewayTrueKeyTrueKeySchedulerTrueKeyServiceHelperTSMUI0DetectVeeam Backup Catalog Data ServiceVeeamBackupSvcVeeamBrokerSvcVeeamCatalogSvcVeeamCloudSvcVeeamDeploymentServiceVeeamDeploySvcVeeamEnterpriseManagerSvcVeeamHvIntegrationSvcVeeamMountSvcVeeamNFSSvcVeeamRESTSvcVeeamTransportSvcVGAuthServiceVMToolsVMwareVMwareCAFCommAmqpListenerVMwareCAFManagementAgentHostvmware-converter-agentvmware-converter-servervmware-converter-workerW3SvcwbengineWdNisSvcWebClientWinDefendWinVNC4WRSVCZoolz 2 Service |

### Windows process termination list

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a2service.exea2start.exeaawservice.exeacaas.exeacaegmgr.exeacaif.exeacais.exeacctmgr.exeaclient.exeaclntusr.exead-aware2007.exeadministrator.exeadminserver.exeaesecurityservice.exeaexagentuihost.exeaexnsagent.exeaexnsrcvsvc.exeaexsvc.exeaexswdusr.exeaflogvw.exeafwserv.exeagntsvc.exeahnrpt.exeahnsd.exeahnsdsv.exealert.exealertsvc.exealmon.exealogserv.exealsvc.exealunotify.exealupdate.exealuschedulersvc.exeamsvc.exeamswmagtaphost.exeappsvc32.exeaps.exeapvxdwin.exeashbug.exeashchest.exeashcmd.exeashdisp.exeashenhcd.exeashlogv.exeashmaisv.exeashpopwz.exeashquick.exeashserv.exeashsimp2.exeashsimpl.exeashskpcc.exeashskpck.exeashupd.exeashwebsv.exeasupport.exeaswdisp.exeaswregsvr.exeaswserv.exeaswupdsv.exeaswwebsv.exeatrshost.exeatwsctsk.exeaupdrun.exeaus.exeauth8021x.exeautoup.exeavcenter.exeavconfig.exeavconsol.exeavengine.exeavesvc.exeavfwsvc.exeavkproxy.exeavkservice.exeavktray.exeavkwctl.exeavltmain.exeavmailc.exeavmcdlg.exeavnotify.exeavscan.exeavscc.exeavserver.exeavshadow.exeavsynmgr.exeavtask.exeavwebgrd.exebasfipm.exebavtray.exebcreporter.exebcrservice.exebdagent.exebdc.exebdlite.exebdmcon.exebdredline.exebdss.exebdsubmit.exebhipssvc.exebka.exeblackd.exeblackice.exebluestripecollector.exeblupro.exebmrt.exebwgo0000ca.execaantispyware.execaav.execaavcmdscan.execaavguiscan.execaf.execafw.execaissdt.execalogdump.execapfaem.execapfasem.execapfsem.execapmuamagt.execappactiveprotection.execasc.execasecuritycenter.execaunst.execavrep.execavrid.execavscan.execavtray.execcap.execcapp.execcemflsv.execcenter.execcevtmgr.execcflic0.execcflic4.execclaw.execcm messaging.execcnfagent.execcprovsp.execcproxy.execcpxysvc.execcschedulersvc.execcsetmgr.execcsmagtd.execcsvchst.execcsystemreport.execctray.execcupdate.execdm.execertificateprovider.execertificationmanagerservicent.execfftplugin.execfnotsrvd.execfp.execfpconfg.execfpconfig.execfplogvw.execfpsbmit.execfpupdat.execfsmsmd.execheckup.exechrome.execis.execistray.execka.execlamscan.execlamtray.execlamwin.execlient.execlient64.execlps.execlpsla.execlpsls.execlshield.execmdagent.execmdinstall.execmgrdian.execntaosmgr.execollwrap.execomhost.execonfig_api_service.execonsole.execontrol_panel.execoreframeworkhost.execoreserviceshell.execpd.execpdclnt.execpf.execpntsrv.execramtray.execrashrep.execrdm.execrssvc.execsacontrol.execsadmin.execsauth.execsdbsync.execsfalconservice.execsinject.execsinsm32.execsinsmnt.execslog.execsmon.execsradius.execsrss_tc.execssauth.execstacacs.exectdataload.execwbunnav.execylancesvc.execylanceui.exedao_log.exedbeng50.exedbserv.exedbsnmp.exedbsrv9.exedefwatchdefwatch.exedeloeminfs.exedeteqt.agent.exediskmon.exedjsnetcn.exedlservice.exedltray.exedolphincharge.edolphincharge.exedoscan.exedpmra.exedr_serviceengine.exedrwagntd.exedrwagnui.exedrweb.exedrweb32.exedrweb32w.exedrweb386.exedrwebcgp.exedrwebcom.exedrwebdc.exedrwebmng.exedrwebscd.exedrwebupw.exedrwebwcl.exedrwebwin.exedrwinst.exedrwupgrade.exedsmcad.exedsmcsvc.exedwarkdaemon.exedwengine.exedwhwizrd.exedwnetfilter.exedwrcst.exedwwin.exeedisk.exeeeyeevnt.exeegui.exeehttpsrv.exeekrn.exeelogsvc.exeemlibupdateagentnt.exeemlproui.exeemlproxy.exeencsvc.exeendpointsecurity.exeengineserver.exeentitymain.exeepmd.exeera.exeerlsrv.exeesecagntservice.exeesecservice.exeesmagent.exeetagent.exeetconsole3.exeetcorrel.exeetloganalyzer.exeetreporter.exeetrssfeeds.exeetscheduler.exeetwcontrolpanel.exeeuqmonitor.exeeventparser.exeevtarmgr.exeevtmgr.exeevtprocessecfile.exeewidoctrl.exeexcel.exeexecstat.exefameh32.exefcappdb.exefcdblog.exefch32.exefchelper64.exefcsms.exefcssas.exefih32.exefirefox.exefirefoxconfig.exefiresvc.exefiretray.exefirewallgui.exefmon.exefnplicensingservice.exeforcefield.exefpavserver.exefprottray.exeframeworkservicframeworkservic.exeframeworkservice.exefrzstate2k.exefsaa.exefsaua.exefsav32.exefsavgui.exefscuif.exefsdfwd.exefsgk32.exefsgk32st.exefsguidll.exefsguiexe.exefshdll32.exefshoster32.exefshoster64.exefsm32.exefsma32.exefsmb32.exefsorsp.exefspc.exefspex.exefsqh.exefssm32.exefwcfg.exefwinst.exe | fws.exegcascleaner.exegcasdtserv.exegcasinstallhelper.exegcasnotice.exegcasserv.exegcasservalert.exegcasswupdater.exeGdfirewalltray.exegdfwsvc.exegdscan.exegfireporterservice.exeghost_2.exeghosttray.exegiantantispywaremain.exegiantantispywareupdater.exegooglecrashhandler.exegooglecrashhandler64.exegoogleupdate.exegziface.exegzserv.exehasplmv.exehdb.exehealthservice.exehpqwmiex.exehwapi.exeicepack.exeidsinst.exeiface.exeigateway.exeilicensesvc.exeinet_gethost.exeinfopath.exeinicio.exeinonmsrv.exeinorpc.exeinort.exeinotask.exeinoweb.exeisafe.exeisafinst.exeisntsmtp.exeisntsysmonitorispwdsvc.exeisqlplussvc.exeisscsf.exeissdaemon.exeissvc.exeisuac.exeiswmgr.exeitmrt_supportdiagnostics.exeitmrt_trace.exeitmrtsvc.exeixaptsvc.exeixavsvc.exeixfwsvc.exekabackreport.exekaccore.exekanmcmain.exekansgui.exekansvr.exekb891711.exekeysvc.exekis.exekislive.exekissvc.exeklnacserver.exeklnagent.exeklserver.exeklswd.exeklwtblfs.exekmailmon.exeknownsvr.exeknupdatemain.exekpf4gui.exekpf4ss.exekpfw32.exekpfwsvc.exekrbcc32s.exekswebshield.exekvdetech.exekvmonxp.kxpkvmonxp_2.kxpkvolself.exekvsrvxp.exekvsrvxp_1.exekvxp.kxpkwatch.exekwsprod.exekxeserv.exeleventmgr.exelivesrv.exelmon.exelog_qtine.exeloggetor.exeloggingserver.exeluall.exelucallbackproxy.exelucoms.exelucoms~1.exelucomserver.exelwdmserver.exemacmnsvc.exemacompatsvc.exemanagementagenthost.exemanagementagentnt.exemantispm.exemasalert.exemassrv.exemasvc.exembamservice.exembamtray.exemcagent.exemcapexe.exemcappins.exemcconsol.exemcdash.exemcdetect.exemcepoc.exemcepocfg.exemcinfo.exemcmnhdlr.exemcmscsvc.exemcnasvc.exemcods.exemcpalmcfg.exemcpromgr.exemcproxy.exemcregwiz.exemcsacore.exemcscript_inuse.exemcshell.exemcshield.exemcshld9x.exemcsvhost.exemcsysmon.exemctray.exemctskshd.exemcui32.exemcuimgr.exemcupdate.exemcupdmgr.exemcvsftsn.exemcvsrte.exemcvsshld.exemcwce.exemcwcecfg.exemfeann.exemfecanary.exemfeesp.exemfefire.exemfefw.exemfehcs.exemfemactl.exemfemms.exemfetp.exemfevtps.exemfewc.exemfewch.exemgavrtcl.exemghtml.exemgntsvc.exemonitoringhost.exemonsvcnt.exemonsysnt.exempcmdrun.exempf.exempfagent.exempfconsole.exempfservice.exempfsrv.exempftray.exemps.exempsevh.exempsvc.exemrf.exemsaccess.exemsascui.exemscifapp.exemsdtssrvr.exemsftesql.exemskagent.exemskdetct.exemsksrver.exemsksrvr.exemsmdsrv.exemsmpeng.exemspmspsv.exemspub.exemsscli.exemsseces.exemsssrv.exemusnotificationux.exemyagttry.exemydesktopqos.exemydesktopservice.exemysqld.exemysqld-nt.exemysqld-opt.exenailgpip.exenaprdmgr.exenavectrl.exenavelog.exenavesp.exenavshcom.exenavw32.exenavwnt.exencdaemon.exend2svc.exendetect.exendrvs.exendrvx.exeneotrace.exenerosvc.exenetalertclient.exenetcfg.exenetsession_win.exenetworkagent.exenexengctw32.exengserver.exenimbus.exenimcluster.exenip.exenipsvc.exenisoptui.exenisserv.exenissrv.exenisum.exenjeeves.exenlclient.exenlsvc.exenmagent.exenmain.exenortonsecurity.exenpfmntor.exenpfmsg.exenpfmsg2.exenpfsvice.exenpmdagent.exenprotect.exenpscheck.exenpssvc.exenrmenctb.exenscsrvce.exensctop.exenslocollectorservice.exensmdemf.exensmdmon.exensmdreal.exensmdsch.exensmdtr.exentcaagent.exentcadaemon.exentcaservice.exentevl.exentrtscan.exentservices.exenvcoas.exenvcsched.exenymse.exeoasclnt.exeocautoupds.exeocomm.exeocssd.exeoespamtest.exeofcdog.exeofcpfwsvc.exeokclient.exeolfsnt40.exeomniagent.exeomslogmanager.exeomtsreco.exeonenote.exeonlinent.exeonlnsvc.exeop_viewer.exeopscan.exeoracle.exeoutlook.exeoutpost.exepaamsrv.exepadfsvr.exepagent.exepagentwd.exepasystemtray.exepatch.exepatrolagent.exepatrolperf.exepavbckpt.exepavfires.exepavfnsvr.exepavjobs.exepavkre.exepavmail.exepavreport.exepavsched.exepavsrv50.exepavsrv51.exepavsrv52.exepavupg.exepaxton.net2.clientservice.exepaxton.net2.commsserverservice.exepccclient.exepccguide.exepcclient.exepccnt.exepccntmon.exepccntupd.exepccpfw.exepcctlcom.exepcscan.exepcscm.exepcscnsrv.exepcsws.exepctsauxs.exepctsgui.exepctssvc.exepctstray.exepep.exepersfw.exepmgreader.exepmon.exepnmsrv.exepntiomon.exePop3pack.exepop3trap.exepoproxy.exepowerpnt.exeppclean.exeppctlpriv.exe | ppmcativedetection.exeppppwallrun.exepqibrowser.exepqv2isvc.exepralarmmgr.exeprcalculationmgr.exeprconfigmgr.exeprdatabasemgr.exepremailengine.exepreventmgr.exeprevsrv.exeprftpengine.exeprgateway.exeprintdevice.exeprivacyiconclient.exeprlicensemgr.exeprocexp.exeproficy administrator.exeproficyclient.exe4proficypublisherservice.exeproficyserver.exeproficysts.exeproutil.exeprprintserver.exeprproficymgr.exeprrds.exeprreader.exeprrouter.exeprschedulemgr.exeprstubber.exeprsummarymgr.exeprunsrv.exeprwriter.exepsanhost.exepsctris.exepsctrls.exepsh_svc.exepshost.exepsimreal.exepsimsvc.exepskmssvc.exepsuamain.exepsuaservice.exepthosttr.exepview.exepviewer.exepwdfilthelp.exepxemtftp.exepxeservice.exeqclean.exeqdcsfs.exeqoeloader.exeqserver.exerapapp.exerapuisvc.exeras.exerasupd.exerav.exeravmon.exeravmond.exeravservice.exeravstub.exeravtask.exeravtray.exeravupdate.exeravxp.exercsvcmon.exerdrcef.exerealmon.exeredirsvc.exeregmech.exeremupd.exerepmgr64.exereportersvc.exereportingservicesservice.exereportsvc.exeretinaengine.exerfwmain.exerfwproxy.exerfwsrv.exerfwstub.exernav.exernreport.exerouternt.exerpcserv.exerscd.exerscdsvc.exersnetsvr.exerssensor.exerstray.exertvscan.exerulaunch.exesafeservice.exesahookmain.exesaservice.exesav32cli.exesavfmsectrl.exesavfmselog.exesavfmsesjm.exesavfmsesp.exesavfmsespamstatsmanager.exesavfmsesrv.exesavfmsetask.exesavfmseui.exesavmain.exesavroam.exesavscan.exesavservice.exesavui.exesbamsvc.exesbserv.exescan32.exescanexplicit.exescanfrm.exescanmailoutlook.exescanmsg.exescanwscs.exescfagent_64.exescfmanager.exescfservice.exescftray.exeschdsrvc.exeschupd.exesdrservice.exesdtrayapp.exeseanalyzertool.exeseccenter.exesecuritycenter.exesecuritymanager.exeseestat.exesemsvc.exeserver_eventlog.exeserver_runtime.exesesclu.exesetloadorder.exesetupguimngr.exesevinst.exesgbhp.exeshstat.exesidebar.exesiteadv.exeslee81.exesmc.exesmcgui.exesmex_activeupdasmex_master.exesmex_remoteconfsmex_systemwatcsmoutlookpack.exesms.exesmsectrl.exesmselog.exesmsesjm.exesmsesp.exesmsesrv.exesmsetask.exesmseui.exesmsx.exesnac.exesndmon.exesndsrvc.exesnhwsrv.exesnicheckadm.exesnichecksrv.exesnicon.exesnsrv.exespbbcsvc.exespideragent.exespiderml.exespidernt.exespiderui.exespntsvc.exespooler.exespyemergency.exespyemergencysrv.exesqbcoreservice.exesqlagent.exesqlbrowser.exesqlservr.exesqlwriter.exesrvload.exesrvmon.exesschk.exessecuritymanager.exessm.exessp.exessscheduler.exestarta.exesteam.exestinger.exestopa.exestopp.exestwatchdog.exesvcgenerichostsvcharge.exesvcntaux.exesvdealer.exesvframe.exesvtray.exeswc_service.exeswdsvc.exesweepsrv.sysswi_service.exeswnetsup.exeswnxt.exeswserver.exesymlcsvc.exesymproxysvc.exesymsport.exesymtray.exesymwsc.exesynctime.exesysdoc32.exesysoptenginesvc.exetaskhostw.exetbirdconfig.exetbmon.exetclproc.exetdimon.exeteamviewer_service.exetfgui.exetfservice.exetftray.exetfun.exethebat.exethebat64.exethunderbird.exetiaspn~1.exetmas.exetmlisten.exetmntsrv.exetmpfw.exetmproxy.exetnbutil.exetnslsnr.exetoolbarupdater.exetpsrv.exetraflnsp.exetraptrackermgr.exetrjscan.exetrupd.exetsansrf.exetsatisy.exetscutynt.exetsmpnt.exeucservice.exeudaterui.exeuiseagnt.exeuiwatchdog.exeumxagent.exeumxcfg.exeumxfwhlp.exeumxpol.exeunsecapp.exeunvet32.exeup2date.exeupdate_task.exeupdaterui.exeupdtnv28.exeupfile.exeuplive.exeuploadrecord.exeupschd.exeurl_response.exeurllstck.exeuseractivity.exeuseranalysis.exeusergate.exeusrprmpt.exev2iconsole.exev3clnsrv.exev3exec.exev3imscn.exev3lite.exev3main.exev3medic.exev3sp.exev3svc.exevetmsg.exevettray.exevgauthservice.exevisio.exevmacthlp.exevmtoolsd.exevmware-converter.exevmware-converter-a.exevmwaretray.exevpatch.exevpc32.exevpdn_lu.exevprosvc.exevprot.exevptray.exevrv.exevrvmail.exevrvmon.exevrvnet.exevshwin32.exevsmain.exevsmon.exevsserv.exevsstat.exevstskmgr.exewebproxy.exewebscanx.exewebsensecontrolservice.exewebtrapnt.exewfxctl32.exewfxmod32.exewfxsnt40.exewin32sysinfo.exewinlog.exewinroute.exewinvnc4.exewinword.exewordpad.exeworkflowresttest.exewrctrl.exewrsa.exewrspysetup.exewscntfy.exewssfcmai.exewtusystemsuport.exexcommsvr.exexfilter.exexfssvccon.exezanda.exezapro.exezavcore.exezillya.exezlclient.exezlh.exezonealarm.exezoolz.exe |
