---
title: "Fall 2023 Global Threat Report Outro"
slug: "fall-2023-global-threat-report-outro"
date: "2023-10-19"
description: "This article highlights the essential contributions to the Global Threat Report from the Security Intelligence team, and describes three major phenomena impacting the threat landscape."
author:
  - slug: devon-kerr
image: "image4.png"
category:
  - slug: reports
tags:
  - gtr
---

After months of diligent work, Elastic Security Labs is excited to announce the publication of the [October 2023 Global Threat Report](https://www.elastic.co/explore/security-without-limits/2023-global-threat-report). For our second annual publication of this kind, we knew it was going to be a greater effort– not only did the volume of events increase more than 1000%, we had entirely new types and depth of visibility from features released since our inaugural report.

It goes without saying (but let’s say it for good measure) that none of this would be possible without our users sharing more than one billion security events each year with us. And it certainly wouldn’t be possible without our Elastic colleagues who make our powerful world-spanning capability. 

One essential contributor is the Threat Research and Detection Engineering team (TRaDE), who develop features like rules and investigation guides, and assigned the legendary [Terrance DeJesus](https://twitter.com/_xDeJesus). Terrance was instrumental in creating the inaugural report, applying his [cloud attack surface expertise](https://www.elastic.co/security-labs/google-workspace-attack-surface-part-one) and security operations experience to this process. Another crucial team is Security Data Analytics (SDA), which is responsible for all the systems that enable us to analyze telemetry. [Chris Donaher](https://twitter.com/c_donaher) leads SDA by day (also by night, technically), and helped us comb through hundreds of millions of events this year. 

The work from these teams and the rest of Elastic Security Labs shows our commitment to providing security teams with actionable intelligence about threat phenomena so they can better prepare for, resist, and evict threats. By democratizing access to knowledge and resources, including publications like the Global Threat Report, we hope to demonstrate a more effective way to improve security outcomes. We’re more secure together and we can’t succeed without each other.

In our observations, we identified the following factors as reactions to security innovations that are making environments hostile to threats:
 - Heavy adversary investments in defense evasion like using built-in execution proxies to run malicious code, masquerading as legitimate software, and software supply-chain compromise
 - Significant research devoted to bypassing, tampering with, or disabling security instrumentation
 - Increased reliance on credential theft to enable business email and cloud-resource compromise, places where endpoint visibility is not generally available

### Defense Evasion 

During the development of our inaugural Global Threat Report last year, we were surprised to see how often adversaries used a defense evasion capability regardless of the industry or region they targeted. After analyzing events from thousands of different environments all over the world, we better understood that defense evasion was a reaction to the state of security. It was a trend we saw again this year, just one of several forces shaping the threat landscape today.

More than 43% of the techniques and procedures we observed this year were forms of defense evasion, with [System Binary Proxy Execution](https://attack.mitre.org/techniques/T1218/) representing almost half of those events. These utilities are present on all operating systems and facilitate code execution– some common examples include software that interprets scripts, launches DLLs, and executes web content.

![Figure 1. Top defense evasion techniques](/assets/images/fall-2023-global-threat-report-outro/image2.png)

[BLISTER](https://www.elastic.co/security-labs/revisiting-blister-new-developments-of-the-blister-loader), which is a malware loader associated with financially-motivated intrusions, relied on the *rundll32.exe* proxy built into every version of Microsoft Windows to launch their backdoor this year. The BLISTER loader is a useful example because its authors invested a great deal of energy encrypting and obfuscating their malicious code inside a benign application. They fraudulently signed their “franken-payload” to ensure human and machine mitigations didn’t interfere. 

### Endpoint tampering

This year we also saw the popularity of Bring Your Own Vulnerable Driver (BYOVD), which was [described](https://www.elastic.co/security-labs/forget-vulnerable-drivers-admin-is-all-you-need) by [Gabe Landau](https://twitter.com/GabrielLandau) in a recent publication and provides a way to load an exploitable driver on Windows systems. Drivers run with system-level privileges but what’s more interesting is how vulnerable drivers can be used to disable or [tamper with security tools](https://thehackernews.com/2023/04/ransomware-hackers-using-aukill-tool-to.html). It won’t be long before more adversaries pivot from using this capability to launch malware and instead use it to uninstall security sensors. 

To see this in action, look no further than your friendly neighborhood ransomware-as-a-service ecosystem. SOCGHOLISH, the group associated with BLISTER coincidentally, is one of multitudes that grew out of startup digs and became a criminal enterprise. Most of the ransomware we see is related to these kinds of services– and even as one gets disrupted it seems another is always emerging to take its place. 

![Figure 2. Most frequently seen ransomware infections](/assets/images/fall-2023-global-threat-report-outro/image1.png)

This is, in a very literal sense, a human phenomenon. Threats that endure periods of security innovation and disruption seem to do so by learning not to be caught, and one strategy of mature threats is to move edge-ward to Internet-facing systems, network devices, appliances, or cloud platforms where visibility is less mature. Consider the cost and relative risk of the following options: develop a feature-rich multiplatform implant with purposeful capabilities or purchase account credentials from a broker.

### Credential Access

Although only about 7% of the data we analyzed involved one form of credential theft or another, 80% of those leveraged built-in operating system features. With functioning stolen credentials, many threat groups can directly interact with an enterprise’s critical data to access email, steal intellectual property, or deploy cloud resources. 

![Figure 3. Commonly seen credential access techniques](/assets/images/fall-2023-global-threat-report-outro/image3.png)

Abusing stolen credentials has more utility today than ever before, given the widespread adoption of cloud for storage, productivity, code management, and authentication to third party services. For those threats that prioritize a low profile over other goals, credential theft is a shortcut with low exposure.

Insights like these, and many others, can be found in the 2023 Global Threat Report along with forecasts and threat profiles. Elastic Security Labs shares [malware research](https://www.elastic.co/security-labs/disclosing-the-bloodalchemy-backdoor), [tools](https://www.elastic.co/security-labs/unpacking-icedid), [intelligence analyses](https://www.elastic.co/security-labs/inital-research-of-jokerspy), as well as [detection science](https://www.elastic.co/security-labs/peeling-back-the-curtain-with-call-stacks) and [machine learning/artificial intelligence](https://www.elastic.co/security-labs/accelerating-elastic-detection-tradecraft-with-llms) research.
 
You can [download the report](https://www.elastic.co/explore/security-without-limits/2023-global-threat-report) or check out our [other assets](http://elastic.co/gtr). Reach out to us on [X](https://twitter.com/elasticseclabs) and get a deeper dive on the GTR results with our webinar [Prepare for tomorrow: Insights from the 2023 Elastic Global Threat Report](https://www.elastic.co/virtual-events/insights-from-the-2023-elastic-global-threat-report). 