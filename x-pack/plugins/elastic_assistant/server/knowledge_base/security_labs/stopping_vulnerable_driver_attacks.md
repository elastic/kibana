---
title: "Stopping Vulnerable Driver Attacks"
slug: "stopping-vulnerable-driver-attacks"
date: "2023-03-01"
subtitle: "Using vulnerable drivers to gain kernel mode execution."
description: "This post includes a primer on kernel mode attacks, along with Elastic’s recommendations for securing users from kernel attacks leveraging vulnerable drivers."
author:
  - slug: joe-desimone
image: "blog-thumb-clock-gears.jpg"
category:
  - slug: security-operations
  - slug: detection-science
---

## Key takeaways

- Ransomware actors are leveraging vulnerable drivers to tamper with endpoint security products.
- Elastic Security [released](https://github.com/elastic/protections-artifacts/search?q=VulnDriver) 65 YARA rules to detect vulnerable driver abuse.
- Elastic Endpoint (8.3+) protects users from this threat.

## Background

In 2018, [Gabriel Landau](https://twitter.com/GabrielLandau) and [Joe Desimone](https://twitter.com/dez_) presented a [talk](https://i.blackhat.com/us-18/Thu-August-9/us-18-Desimone-Kernel-Mode-Threats-and-Practical-Defenses.pdf) at Black Hat covering the evolution of kernel mode threats on Windows. The most concerning trend was towards leveraging known good but vulnerable drivers to gain kernel mode execution. We showed this was practical, even with hypervisor mode integrity protection ([HVCI](https://docs.microsoft.com/en-us/windows-hardware/design/device-experiences/oem-hvci-enablement)) and Windows Hardware Quality Labs ([WHQL](https://docs.microsoft.com/en-us/windows-hardware/drivers/install/whql-release-signature)) signing requirement enabled. At the time, the risk to everyday users was relatively low, as these techniques were mostly leveraged by advanced state actors and top red teams.

Fast forward to 2022, and attacks leveraging vulnerable drivers are a growing concern due to a [proliferation](https://github.com/hfiref0x/KDU) of open source [tools](https://github.com/br-sn/CheekyBlinder) to perform these [attacks](https://github.com/Cr4sh/KernelForge). Vulnerable drivers have now been [used by ransomware](https://news.sophos.com/en-us/2020/02/06/living-off-another-land-ransomware-borrows-vulnerable-driver-to-remove-security-software/) to terminate security software before encrypting the system. Organizations can reduce their risk by limiting administrative user permissions. However, it is also imperative for security vendors to protect the user-to-kernel boundary because once an attacker can execute code in the kernel, security tools can no longer effectively protect the host. Kernel access gives attackers free rein to tamper or terminate endpoint security products or inject code into protected processes.

This post includes a primer on kernel mode attacks, along with Elastic’s recommendations for securing users from kernel attacks leveraging vulnerable drivers.

## Attack flow

There are a number of flaws in drivers that can allow attackers to gain kernel mode access to fully compromise the system and remain undetected. Some of the [most common](https://www.welivesecurity.com/2022/01/11/signed-kernel-drivers-unguarded-gateway-windows-core/) flaws include granting user mode processes write access to virtual memory, physical memory, or [model-specific registers](https://en.wikipedia.org/wiki/Model-specific_register) (MSR). Classic buffer overflows and missing bounds checks are also common.

A less common driver flaw is unrestricted [handle duplication](https://www.unknowncheats.me/forum/anti-cheat-bypass/312732-physmeme-handle-device-physicalmemory-door-kernel-land-bypasses.html#post2315458). While this may seem like innocuous functionality at first glance, handle duplication can be leveraged to gain full kernel code execution by user mode processes. For example, the latest [Process Explorer](https://docs.microsoft.com/en-us/sysinternals/downloads/process-explorer) driver by Microsoft exposes [such a function](https://github.com/Yaxser/Backstab).

An attacker can leverage this vulnerability to duplicate a [sensitive handle](https://www.unknowncheats.me/forum/anti-cheat-bypass/312732-physmeme-handle-device-physicalmemory-door-kernel-land-bypasses.html#post2315458) to raw physical memory present in the System (PID 4) process.

![Handle to Physical Memory in the System process](/assets/images/stopping-vulnerable-driver-attacks/image1.jpg)

After obtaining [the cr3 value](http://publications.alex-ionescu.com/Recon/ReconBru%202017%20-%20Getting%20Physical%20with%20USB%20Type-C,%20Windows%2010%20RAM%20Forensics%20and%20UEFI%20Attacks.pdf), the attacker can walk the page tables to convert virtual kernel addresses to their associated physical addresses. This grants an arbitrary virtual read/write primitive, which attackers can leverage to easily tamper with kernel data structures or execute arbitrary kernel code. On HVCI-enabled systems, thread control flow can be hijacked to execute arbitrary kernel functions as shown below.

![Hijacking Threat Flow Control](/assets/images/stopping-vulnerable-driver-attacks/image3.jpg)

We reported this issue to Microsoft in the vulnerable driver [submission portal](https://www.microsoft.com/en-us/wdsi/driversubmission) on July 26, but as of this writing have not received a response. We hope Microsoft will consider this a serious security issue worth addressing. Ideally, they will release a fixed version without the vulnerable [IOCTLs](https://docs.microsoft.com/en-us/windows/win32/devio/device-input-and-output-control-ioctl-) and include it in the default HVCI blocklist. This would be consistent with the [blocking](https://github.com/MicrosoftDocs/windows-itpro-docs/blob/ce56a2f15015e07bf35cd05ce3299340d16e759a/windows/security/threat-protection/windows-defender-application-control/microsoft-recommended-driver-block-rules.md?plain=1#L391) of the ProcessHacker (now known as [System Informer](https://github.com/winsiderss/systeminformer)) driver for the [same flaw.](https://www.unknowncheats.me/forum/downloads.php?do=file&id=25441)

## Blocklisting

Blocklisting prevents known vulnerable drivers from loading on a system, and is a great first step to the vulnerable driver problem. Blocklisting can raise the cost of kernel attacks to levels out of reach for some criminal groups, while maintaining low false positive rates. The downside is it does not stop more [advanced groups](https://decoded.avast.io/janvojtesek/the-return-of-candiru-zero-days-in-the-middle-east/), which can identify new, previously-unknown, vulnerable drivers.

Microsoft maintains a [catalog](https://github.com/MicrosoftDocs/windows-itpro-docs/blob/public/windows/security/threat-protection/windows-defender-application-control/microsoft-recommended-driver-block-rules.md) of known exploited or malicious drivers, which should be a minimum baseline. This catalog consists of rules using various combinations of [Authenticode](https://reversea.me/index.php/authenticode-i-understanding-windows-authenticode/) hash, certificate hash (also known as [TBS](https://www.rfc-editor.org/rfc/rfc5280#section-4.1)), internal file name, and version. The catalog is intended to be used by Windows Defender Application Control ([WDAC](https://docs.microsoft.com/en-us/windows/security/threat-protection/windows-defender-application-control/wdac-and-applocker-overview)). We used this catalog as a starting point for a more comprehensive list using the [YARA](https://virustotal.github.io/yara/) community standard.

To expand on the existing list of known vulnerable drivers, we pivoted through VirusTotal data with known vulnerable import hashes and other metadata. We also combed through public attack tooling to identify additional vulnerable drivers. As common practice for Elastic Security, we made our [blocklist](https://github.com/elastic/protections-artifacts/search?q=VulnDriver) available to the community. In Elastic [Endpoint Security](https://www.elastic.co/security/endpoint-security) version 8.3 and newer, all drivers are validated against the blocklist in-line before they are allowed to load onto the system (shown below).

![enter image description here](/assets/images/stopping-vulnerable-driver-attacks/image6.jpg)

## Allowlisting

One of the most robust defenses against this driver threat is to only allow the combination of driver signer, internal file name, version, and/or hashes, which are known to be in use. We recommend organizations be as strict as feasible. For example, do not blanket trust all [WHQL](https://docs.microsoft.com/en-us/windows-hardware/drivers/install/whql-test-signature-program) signed drivers. This is the classic application control method, albeit focusing on drivers. An organization’s diversity of drivers should be more manageable than the entirety of user mode applications. Windows Defender Application Control ([WDAC](https://docs.microsoft.com/en-us/windows/security/threat-protection/windows-defender-application-control/wdac-and-applocker-overview)) is a powerful built-in feature that can be configured this way. However, the learning curve and maintenance costs may still be too high for organizations without well-staffed security teams. To reap most of the benefits of the allowlisting approach, but reduce the cost of implementation to the users (ideally to blocklisting levels), we recommend two approaches in tandem: behavior control and alert on first seen.

## Behavior control

The concept behind behavior control is to produce a more manageable set of allowlistable behavior choke points that can be tuned for high confidence. For example, we can create a behavior control around which applications are allowed to write drivers to disk. This may start with a relatively loose and simple rule:

![Example EQL Query](/assets/images/stopping-vulnerable-driver-attacks/image2.jpg)

From there, we can allowlist the benign applications that are known to exhibit this behavior. Then we receive and triage hits, tune the rule until it becomes high confidence, and then ship as part of our [malicious behavior protection](https://www.elastic.co/blog/whats-new-elastic-security-7-15-0). Elastic SIEM users can use the same technique to [create custom](https://www.elastic.co/guide/en/security/current/rules-ui-create.html) Detection Engine [rules](https://github.com/elastic/detection-rules) tuned specifically for their environment.

## First seen

Elastic Security in 8.4 adds another powerful tool that can be used to identify suspicious drivers. This is the [“New Terms” rule type](https://www.elastic.co/guide/en/security/8.4/rules-ui-create.html#create-new-terms-rule), which can be used to create an alert when a term (driver hash, signer, version, internal file name, etc) is observed for the first time.

![First Seen](/assets/images/stopping-vulnerable-driver-attacks/image5.jpg)

This empowers security teams to quickly surface unusual drivers the first time they’re seen in their environment. This supports a detection opportunity for even previously unknown vulnerable drivers or other driver-based adversary tradecraft.

![Visualizing It](/assets/images/stopping-vulnerable-driver-attacks/image4.jpg)

## Conclusion

Vulnerable driver exploitation, once relegated to advanced adversaries, has now proliferated to the point of being used in ransomware attacks. The time for the security community to come together and act on this problem is now. We can start raising the cost by collaborating on blocklists as a community. We should also investigate additional detection strategies such as behavior control and anomaly detection to raise the cost further without requiring significant security expertise or resources to achieve.
