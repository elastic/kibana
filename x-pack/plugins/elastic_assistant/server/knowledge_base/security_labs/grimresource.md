---
title: "GrimResource - Microsoft Management Console for initial access and evasion"
slug: "grimresource"
date: "2024-06-22"
subtitle: "Adversaries adapting to Microsoft's new security landscape"
description: "Elastic researchers uncovered a new technique, GrimResource, which allows full code execution via specially crafted MSC files. It underscores a trend of well-resourced attackers favoring innovative initial access methods to evade defenses."
author:
  - slug: joe-desimone
  - slug: samir-bousseaden
image: "grimresource.jpg"
category:
  - slug: attack-pattern
tags:
  - grimresource
  - mcc
  - msc
---

## Overview

After Microsoft [disabled](https://learn.microsoft.com/en-us/deployoffice/security/internet-macros-blocked) office macros by default for internet-sourced documents, other infection vectors like JavaScript, MSI files, LNK objects, and ISOs have surged in popularity. However, these other techniques are scrutinized by defenders and have a high likelihood of detection. Mature attackers seek to leverage new and undisclosed infection vectors to gain access while evading defenses. A [recent example](https://www.genians.co.kr/blog/threat_intelligence/facebook) involved DPRK actors using a new command execution technique in MSC files.

Elastic researchers have uncovered a new infection technique also leveraging MSC files, which we refer to as GrimResource. It allows attackers to gain full code execution in the context of `mmc.exe` after a user clicks on a specially crafted MSC file. A [sample](https://www.virustotal.com/gui/file/14bcb7196143fd2b800385e9b32cfacd837007b0face71a73b546b53310258bb) leveraging GrimResource was first uploaded to VirusTotal on June 6th.

## Key takeaways

* Elastic Security researchers uncovered a novel, in-the-wild code execution technique leveraging specially crafted MSC files referred to as GrimResource
* GrimResource allows attackers to execute arbitrary code in Microsoft Management Console (`mmc.exe`) with minimal security warnings, ideal for gaining initial access and evading defenses
* Elastic is providing analysis of the technique and detection guidance so the community can protect themselves 

## Analysis

The key to the [GrimResource](https://gist.github.com/joe-desimone/2b0bbee382c9bdfcac53f2349a379fa4) technique is using an old [XSS flaw](https://medium.com/@knownsec404team/from-http-domain-to-res-domain-xss-by-using-ie-adobes-pdf-activex-plugin-ba4f082c8199) present in the `apds.dll` library. By adding a reference to the vulnerable APDS resource in the appropriate StringTable section of a crafted MSC file, attackers can execute arbitrary javascript in the context of `mmc.exe`. Attackers can combine this technique with [DotNetToJScript](https://github.com/tyranid/DotNetToJScript/tree/master) to gain arbitrary code execution.

![Reference to apds.dll redirect in StringTable](/assets/images/grimresource/image17.png "Reference to apds.dll redirect in StringTable")

At the time of writing, the sample identified in the wild had 0 static detections in [VirusTotal](https://www.virustotal.com/gui/file/14bcb7196143fd2b800385e9b32cfacd837007b0face71a73b546b53310258bb/details).

![VirusTotal results](/assets/images/grimresource/image1.png "VirusTotal results")

The sample begins with a transformNode obfuscation technique, which was observed in recent but unrelated [macro samples](https://twitter.com/decalage2/status/1773114380013461799). This aids in evading ActiveX security warnings.

![transformNode evasion and obfuscation technique](/assets/images/grimresource/image15.png "transformNode evasion and obfuscation technique")

This leads to an obfuscated embedded VBScript, as reconstructed below:

![Obfuscated VBScript](/assets/images/grimresource/image8.png "Obfuscated VBScript")

The VBScript sets the target payload in a series of environment variables and then leverages the [DotNetToJs](https://github.com/tyranid/DotNetToJScript/blob/master/DotNetToJScript/Resources/vbs_template.txt) technique to execute an embedded .NET loader. We named this component PASTALOADER and may release additional analysis on this specific tool in the future.

![Setting the target payload environment variables](/assets/images/grimresource/image13.png "Setting the target payload environment variables")

![DotNetToJs loading technique](/assets/images/grimresource/image2.png "DotNetToJs loading technique")

PASTALOADER retrieves the payload from environment variables set by the VBScript in the previous step:

![PASTALOADER loader retrieving the payload](/assets/images/grimresource/image14.png "PASTALOADER loader retrieving the payload")

Finally, PASTALOADER spawns a new instance of `dllhost.exe` and injects the payload into it. This is done in a deliberately stealthy manner using the [DirtyCLR](https://github.com/ipSlav/DirtyCLR/tree/7b1280fee780413d43adbad9f4c2a9ce7ed9f29e) technique, function unhooking, and indirect syscalls. In this sample, the final payload is Cobalt Strike.

![Payload injected into dllhost.exe](/assets/images/grimresource/image7.png "Payload injected into dllhost.exe")

## Detections

In this section, we will examine current behavior detections for this sample and present new, more precise ones aimed at the technique primitives.

### Suspicious Execution via Microsoft Common Console

This detection was established prior to our discovery of this new execution technique. It was originally designed to identify a [different method](https://www.genians.co.kr/blog/threat_intelligence/facebook) (which requires the user to click on the Taskpad after opening the MSC file) that exploits the same MSC file type to execute commands through the Console Taskpads command line attribute:

![Command task MSC sample](/assets/images/grimresource/image12.png "Command task MSC sample")

```
process where event.action == "start" and
 process.parent.executable : "?:\\Windows\\System32\\mmc.exe" and  process.parent.args : "*.msc" and
 not process.parent.args : ("?:\\Windows\\System32\\*.msc", "?:\\Windows\\SysWOW64\\*.msc", "?:\\Program files\\*.msc", "?:\\Program Files (x86)\\*.msc") and
 not process.executable :
              ("?:\\Windows\\System32\\mmc.exe",
               "?:\\Windows\\System32\\wermgr.exe",
               "?:\\Windows\\System32\\WerFault.exe",
               "?:\\Windows\\SysWOW64\\mmc.exe",
               "?:\\Program Files\\*.exe",
               "?:\\Program Files (x86)\\*.exe",
               "?:\\Windows\\System32\\spool\\drivers\\x64\\3\\*.EXE",
               "?:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
```
It triggers here because this sample opted to spawn and inject a sacrificial instance of dllhost.exe:

![GrimResource detected](/assets/images/grimresource/image10.png "GrimResource detected")

### .NET COM object created in non-standard Windows Script Interpreter

The sample is using the [DotNetToJScript](https://github.com/tyranid/DotNetToJScript) technique, which triggers another detection looking for RWX memory allocation from .NET on behalf of a Windows Script Host (WSH) script engine (Jscript or Vbscript):

The following EQL rule will detect execution via the .NET loader:

```
api where
  not process.name : ("cscript.exe", "wscript.exe") and
  process.code_signature.trusted == true and
  process.code_signature.subject_name : "Microsoft*" and
  process.Ext.api.name == "VirtualAlloc" and
  process.Ext.api.parameters.allocation_type == "RESERVE" and 
  process.Ext.api.parameters.protection == "RWX" and
  process.thread.Ext.call_stack_summary : (
    /* .NET is allocating executable memory on behalf of a WSH script engine
     * Note - this covers both .NET 2 and .NET 4 framework variants */
    "*|mscoree.dll|combase.dll|jscript.dll|*",
    "*|mscoree.dll|combase.dll|vbscript.dll|*",
    "*|mscoree.dll|combase.dll|jscript9.dll|*",
    "*|mscoree.dll|combase.dll|chakra.dll|*"
)
```

The following alert shows `mmc.exe` allocating RWX memory and the `process.thread.Ext.call_stack_summary `captures the origin of the allocation from `vbscript.dll` to `clr.dll` : 

![mmc.exe allocating RWX memory](/assets/images/grimresource/image6.png "mmc.exe allocating RWX memory")

### Script Execution via MMC Console File 

The two previous detections were triggered by specific implementation choices to weaponize the GrimResource method (DotNetToJS and spawning a child process). These detections can be bypassed by using more OPSEC-safe alternatives.

Other behaviors that might initially seem suspicious — such as `mmc.exe` loading `jscript.dll`, `vbscript.dll`, and `msxml3.dll` — can be clarified compared to benign data. We can see that, except for `vbscript.dll`, these WSH engines are typically loaded by `mmc.exe`: 

![Normal library load behaviors by mmc.exe](/assets/images/grimresource/image4.png "Normal library load behaviors by mmc.exe")

The core aspect of this method involves using [apds.dll](https://strontic.github.io/xcyclopedia/library/apds.dll-DF461ADCCD541185313F9439313D1EE1.html) to execute Jscript via XSS. This behavior is evident in the mmc.exe Procmon output as a `CreateFile` operation (`apds.dll` is not loaded as a library):

![apds.dll being invoked in the MSC StringTable](/assets/images/grimresource/image9.png "apds.dll being invoked in the MSC StringTable")

![Example of the successful execution of GrimResource](/assets/images/grimresource/image16.png "Example of the successful execution of GrimResource")

We added the following detection using Elastic Defend file open events where the target file is `apds.dll` and the `process.name` is `mmc.exe`: 

The following EQL rule will detect the execution of a script from the MMC console:

```
sequence by process.entity_id with maxspan=1m
 [process where event.action == "start" and
  process.executable : "?:\\Windows\\System32\\mmc.exe" and process.args : "*.msc"]
 [file where event.action == "open" and file.path : "?:\\Windows\\System32\\apds.dll"]
```

![Timeline showing the script execution with the MMC console](/assets/images/grimresource/image5.png "Timeline showing the script execution with the MMC console")

### Windows Script Execution via MMC Console File

Another detection and forensic artifact is the creation of a temporary HTML file in the INetCache folder, named `redirect[*] `as a result of the APDS [XSS](https://owasp.org/www-community/attacks/xss/) redirection:

![Contents of redirect.html](/assets/images/grimresource/image11.png "Contents of redirect.html")

The following EQL correlation can be used to detect this behavior while also capturing the msc file path: 

```
sequence by process.entity_id with maxspan=1m
 [process where event.action == "start" and
  process.executable : "?:\\Windows\\System32\\mmc.exe" and process.args : "*.msc"]
 [file where event.action in ("creation", "overwrite") and
  process.executable :  "?:\\Windows\\System32\\mmc.exe" and file.name : "redirect[?]" and 
  file.path : "?:\\Users\\*\\AppData\\Local\\Microsoft\\Windows\\INetCache\\IE\\*\\redirect[?]"]
```

![Timeline detecting redirect.html](/assets/images/grimresource/image3.png "Timeline detecting redirect.html")

Alongside the provided behavior rules, the following YARA rule can be used to detect similar files:

```
rule Windows_GrimResource_MMC {
    meta:
        author = "Elastic Security"
        reference = "https://www.elastic.co/security-labs/GrimResource"
        reference_sample = "14bcb7196143fd2b800385e9b32cfacd837007b0face71a73b546b53310258bb"
        arch_context = "x86"
        scan_context = "file, memory"
        license = "Elastic License v2"
        os = "windows"
    strings:
        $xml = "<?xml"
        $a = "MMC_ConsoleFile" 
        $b1 = "apds.dll" 
        $b2 = "res://"
        $b3 = "javascript:eval("
        $b4 = ".loadXML("
    condition:
       $xml at 0 and $a and 2 of ($b*)
}
```

## Conclusion

Attackers have developed a new technique to execute arbitrary code in Microsoft Management Console using crafted MSC files. Elastic’s existing out of the box coverage shows our defense-in-depth approach is effective even against novel threats like this. Defenders should leverage our detection guidance to protect themselves and their customers from this technique before it proliferates into commodity threat groups. 

## Observables

All observables are also [available for download](https://github.com/elastic/labs-releases/tree/main/indicators/grimresource) in both ECS and STIX formats.

The following observables were discussed in this research.

| Observable                                                       | Type    | Name             | Reference             |
|------------------------------------------------------------------|---------|------------------|-----------------------|
| `14bcb7196143fd2b800385e9b32cfacd837007b0face71a73b546b53310258bb` | SHA-256 | `sccm-updater.msc` | Abused MSC file       |
| `4cb575bc114d39f8f1e66d6e7c453987639289a28cd83a7d802744cd99087fd7` | SHA-256 | N/A              | PASTALOADER           |
| `c1bba723f79282dceed4b8c40123c72a5dfcf4e3ff7dd48db8cb6c8772b60b88` | SHA-256 | N/A              | Cobalt Strike payload |
