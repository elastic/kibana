---
title: "Revisiting BLISTER: New development of the BLISTER loader"
slug: "revisiting-blister-new-developments-of-the-blister-loader"
date: "2023-08-24"
description: "Elastic Security Labs dives deep into the recent evolution of the BLISTER loader malware family."
author:
  - slug: salim-bitam
  - slug: daniel-stepanic
image: "cracked-lava.jpg"
category:
  - slug: malware-analysis
tags:
  - blister
  - malware
  - ref7890
---

## Preamble

In a fast-paced and ever-changing world of cybercrime threats, the tenacity and adaptability of malicious actors is a significant concern. BLISTER, a malware loader initially [discovered](https://www.elastic.co/security-labs/elastic-security-uncovers-blister-malware-campaign) by Elastic Security Labs in 2021 and associated with financially-motivated intrusions, is a testament to this trend as it continues to develop additional capabilities. Two years after its initial discovery, BLISTER continues to receive updates while flying under the radar, gaining momentum as an emerging threat. Recent findings from Palo Alto’s [Unit 42](https://twitter.com/Unit42_Intel/status/1684583246032506880) describe an updated [SOCGHOLISH](https://redcanary.com/threat-detection-report/threats/socgholish/) infection chain used to distribute BLISTER and deploy a payload from [MYTHIC](https://github.com/its-a-feature/Mythic), an open-source Command and Control (C2) framework.

## Key takeaways

 - Elastic Security Labs has been monitoring malware loader BLISTER ramping up with new changes, and ongoing development with signs of imminent threat activity
 - New BLISTER update includes keying feature that allows for precise targeting of victim networks and lowers exposure within VM/sandbox environments
 - BLISTER now integrates techniques to remove any process instrumentation hook and has modified its configuration with multiple revisions, now encompassing additional fields and flags.

## Overview

Our research uncovered new functionality that was previously absent within the BLISTER family, indicating ongoing development. However, the malware authors continue to use a distinctive technique of embedding malicious code in otherwise legitimate applications. This approach superficially appears successful, given the low rates of detection for many vendors as seen in VirusTotal. The significant amount of benign code and use of encryption to protect the malicious code are likely two factors impacting detection.

![Example of BLISTER detection rates on initial upload
](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image11.png)

Recently, Elastic Security Labs has observed many new BLISTER loaders in the wild. After analyzing various samples, it’s clear that the malware authors have made some changes and have been watching the antivirus industry closely. In one [sample](https://www.virustotal.com/gui/file/b4f37f13a7e9c56ea95fa3792e11404eb3bdb878734f1ca394ceed344d22858f) from early June, we can infer that the authors were testing with a non-production loader that displays a Message Box displaying the strings “Test”.

![BLISTER payload with Message Box test](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image2.png)

Readers can see a disassembled view of this functionality below.

![BLISTER testing payloads with Message Box
](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image4.jpg)

By the end of July, we observed campaigns involving a new BLISTER loader that targeted victim organizations to deploy the MYTHIC implant.

![MYTHIC running inside injected WerFault process
](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image6.jpg)

At the time of this writing, Elastic Security Labs is seeing a stream of BLISTER samples which deploy MYTHIC and have very low rates of detection. 

![Wave of BLISTER samples in August 2023](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image1.png)

## Comparative analyses

### Smuggling malicious code

The authors behind BLISTER employ a consistent strategy of embedding BLISTER's malicious code within a legitimate library. The most recent variants of this loader have targeted the [VLC](https://www.videolan.org/vlc/) Media Player library to smuggle their malware into victim environments. This blend of benign and malicious code seems effective at defeating some kinds of machine-learning models.

![Meta data of BLISTER sample](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image10.png)

The following is a comparison between a legitimate VLC DLL and one that is infected with BLISTER’s code. In the infected sample, the entry point that references malicious code has been indicated in red. This methodology is similar to prior BLISTER variants.

![Comparison between original and patched VLC library](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image8.png)

### Different hashing algorithm

One of the changes implemented since our last [write-up](https://www.elastic.co/security-labs/blister-loader) is the adoption of a different hashing algorithm used in the core and in the loader part of BLISTER. While the previous version used simple logic to shift bytes, this new version includes a hard-coded seed with XOR and multiplication operations. Researchers speculate that changing the hashing approach helps to evade antimalware products that rely on YARA signatures.

![Disassembled hashing algorithm](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image13.png)

### Configuration retrieval

Following the decryption of malicious code by the BLISTER’d loader, it employs an identical memory scanning method to identify the configuration data blob. This is accomplished by searching for a predetermined, hardcoded memory pattern. A notable contrast from the earlier iteration of BLISTER lies in the fact that the configuration is now decrypted in conjunction with the core code, rather than being treated as a separate entity.

### Environmental keying

A recent addition to BLISTER is the capability to exclusively execute on designated machines. This behavior is activated by configuring the appropriate flag within the malware’s configuration. Subsequently, the malware proceeds to extract the machine's domain name using the `GetComputerNameExW` Windows API. Following this, the domain name is hashed using the previously mentioned algorithm, and the resulting hash is then compared to a hash present in the configuration. This functionality is presumably deployed for the purpose of targeted attacks or for testing scenarios, ensuring that the malware refrains from infecting unintended systems such as those employed by malware researchers.

![Environmental keying feature](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image12.png)

One of the few malware analysis tools capable of quickly exposing this behavior is the awesome [Tiny Tracer](https://github.com/hasherezade/tiny_tracer) utility by [hasherezade](https://twitter.com/hasherezade). We’ve included an excerpt from Tiny_Tracer below which captures the BLISTER process immediately terminating after the `GetComputerNameExW` validation is performed in a sandboxed analysis VM.

![TinyTracer logs](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image15.png)

### Time-based anti-debugging feature

Similar to its predecessors, the malware incorporates a time-based anti-debugging functionality. However, unlike the previous versions in which the timer was hardcoded, the updated version introduces a new field in the configuration. This field enables the customization of the sleep timer, with a default value of 10 minutes. This default interval remains unchanged from prior iterations of BLISTER.

![Time-Based Anti-Debug Feature](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image9.png)

### Unhook process instrumentation to detect syscalls

In this latest version, BLISTER introduces noteworthy functionality: it unhooks any ongoing process instrumentation, a [tactic](https://github.com/ionescu007/HookingNirvana/blob/master/Esoteric%20Hooks.pdf) designed to circumvent userland syscall detection mechanisms upon which certain EDR solutions are based.

![Unhooking process instrumentation](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image3.png)

### BLISTER's configuration

The BLISTER configuration structure has also been changed with the latest variants. Two new fields have been added and the flag field at offset 0 has been changed from a WORD to a DWORD value. The new fields pertain to the hash of the domain for environmental keying and the configurable sleep time; these field values are at offset 4 and 12 respectively. The following is the updated structure of the configuration:

![Configuration structure](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image14.png)

Changes have also been made to the configuration flags, allowing the operator to activate different functions within the malware. Researchers have provided an updated list of functions built upon our prior research into BLISTER.

![Configuration flags enumeration](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image7.png)

## Payload extractor update

In our previous research publication, we introduced an efficient payload extractor tailored to dissect and extract the configuration and payload of the loader. To dissect the most recent BLISTER variants and capture these new details, we enhanced our extractor which is available [here](https://github.com/elastic/labs-releases/tree/main/tools/blister).

![Configuration extractor](/assets/images/revisiting-blister-new-developments-of-the-blister-loader/image5.png)

## Conclusion

[BLISTER](https://www.trendmicro.com/en_us/research/22/d/Thwarting-Loaders-From-SocGholish-to-BLISTERs-LockBit-Payload.html) is one small part of the global cybercriminal ecosystem, providing financially-motivated threats to gain access to victim environments and avoid detection by security sensors. The community should consider these new developments and assess the efficacy of BLISTER detections, Elastic Security Labs will continue to monitor this threat and share actionable guidance.

## Detection logic

### Prevention

 - [Windows.Trojan.Blister](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Blister.yar)
 
 ### Detection
 
 - [Windows Error Manager/Reporting Masquerading](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_windows_error_manager_reporting_masquerading.toml)
 - [Potential Operation via Direct Syscall](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_operation_via_direct_syscall.toml)
 - [Potential Masquerading as Windows Error Manager](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_masquerading_as_windows_error_manager.toml)
 - [Unusual Startup Shell Folder Modification](https://github.com/elastic/detection-rules/blob/main/rules/windows/persistence_evasion_registry_startup_shell_folder_modified.toml)
 - [Potential Masquerading as VLC DLL](https://github.com/elastic/detection-rules/blob/ef432d0907548abf7699fa5d86150dc6b4133125/rules_building_block/defense_evasion_masquerading_vlc_dll.toml)

### YARA

Elastic Security has created [YARA rules](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Blister.yar) to identify this activity. Below is the latest rule that captures the new update to BLISTER.

```yara
rule Windows_Trojan_Blister {
    meta:
        author = "Elastic Security"
        creation_date = "2023-08-02"
        last_modified = "2023-08-08"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "Blister"
        threat_name = "Windows.Trojan.Blister"
        license = "Elastic License v2"
    strings:
        $b_loader_xor = { 48 8B C3 49 03 DC 83 E0 03 8A 44 05 48 [2-3] ?? 03 ?? 4D 2B ?? 75 }
        $b_loader_virtual_protect = { 48 8D 45 50 41 ?? ?? ?? ?? 00 4C 8D ?? 04 4C 89 ?? ?? 41 B9 04 00 00 00 4C 89 ?? F0 4C 8D 45 58 48 89 44 24 20 48 8D 55 F0 }
    condition:
        all of them
}
```

## Observed adversary tactics and techniques

Elastic uses the MITRE ATT&CK framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

 - [Execution](https://attack.mitre.org/tactics/TA0002/)
 - [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
 - [Persistence](https://attack.mitre.org/tactics/TA0003/)

## Techniques / Sub techniques

Techniques and Sub techniques represent how an adversary achieves a tactical goal by performing an action.

 - [System Binary Proxy Execution: Rundll32](https://attack.mitre.org/techniques/T1218/011/)
 - [Execution Guardrails: Environmental Keying](https://attack.mitre.org/techniques/T1480/001/)
 - [Registry Run Keys / Startup Folder](https://attack.mitre.org/techniques/T1547/001/)
 - [Masquerading](https://attack.mitre.org/techniques/T1036/)
 - [Process Injection: Process Hollowing](https://attack.mitre.org/techniques/T1055/012/)

## References

The following were referenced throughout the above research:
 - [Palo Alto Unit42](https://twitter.com/Unit42_Intel/status/1684583246032506880?s=20)
 - [Trendmicro](https://www.trendmicro.com/en_us/research/22/d/Thwarting-Loaders-From-SocGholish-to-BLISTERs-LockBit-Payload.html)
 - [Malpedia](https://malpedia.caad.fkie.fraunhofer.de/details/win.blister)

## Observables

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/blister) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Indicator | Type | Reference |
|-----------|------|-----------|
| 5fc79a4499bafa3a881778ef51ce29ef015ee58a587e3614702e69da304395db | sha256 | BLISTER loader DLL |
