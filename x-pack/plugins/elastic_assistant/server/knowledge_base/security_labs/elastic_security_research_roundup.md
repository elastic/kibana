---
title: "Elastic Security Research Roundup"
slug: "elastic-security-research-roundup"
date: "2022-09-09"
description: "Elastic Security Intelligence and Analytics researches and investigates threat actors, malware, campaigns, or a specific intrusion. We’ll highlight recent research about Log4j, BLISTER, Cobalt Strike, and Operation Bleeding Bear."
author:
  - slug: elastic-security-team
image: "blog-thumb-blind-spots.png"
category:
---

The job of researching the latest vulnerabilities, campaigns, attack patterns, and threat actors is never complete. The [Elastic Security Intelligence and Analytics team’s](https://github.com/elastic/security-research) charter is to democratize access to knowledge and capabilities. We believe doing so is the key to changing the threat landscape and we publish this information to educate Elastic customers and the larger security community.

Our security team researches and publishes information about malware, threat actors, campaigns, attack patterns, and specific vulnerabilities. Here’s a roundup of our latest findings and how to protect your organization.

## Log4j vulnerability research

Quickly after the Log4j vulnerability was released, Elastic provided guidance on how to find the [Log4Shell vulnerability](https://www.elastic.co/blog/log4j2-vulnerability-what-to-know-security-vulnerability-learn-more-elastic-support) using the Elastic Security and Observability solutions. Log4sh impacted organizations from Minecraft to Oracle during one of the busiest vacation seasons. Elastic researched the vulnerability and published more than four articles about this threat quickly as the threat unfolded, including a [response and analysis](https://www.elastic.co/blog/analysis-of-log4shell-cve-2021-45046?utm_source=log4j+hub+blog&utm_medium=embed+link&utm_campaign=log4j_hub_blog&utm_id=log4j) on the security flaw itself and an up-to-date blog on [how to detect log4j2 exploits using Elastic Security](https://www.elastic.co/blog/detecting-log4j2-with-elastic-security?utm_source=log4j+hub+blog&utm_medium=embed+link&utm_campaign=log4j_hub_blog&utm_id=log4j&utm_content=detecting+log4j2+blog). As this threat continues to unfold, so will the research from Elastic on the topic.

## BLISTER malware campaign campaign, identified by Elastic Security

The Elastic Security Intelligence and Analytics team recently uncovered the [BLISTER malware campaign](https://www.elastic.co/blog/elastic-security-uncovers-blister-malware-campaign) and delivered the first research about this campaign. Elastic researchers uncovered a novel malware loader, BLISTER, that was used to execute second-stage, in-memory malware payloads and maintain persistence during the campaign execution — leveraging valid code signing certificates to evade detection.

At the time of the research being published, VirusTotal had very low or no detections active for the identified malware samples. After the research was published, VirusTotal and other security vendors began tagging actions from this malware campaign as suspicious.

## Beaconing malware attacks

Beaconing software can be difficult to detect. Elastic researchers have recently written several articles about this type of command and control communication and how to identify it. The Elastic team recently published research about how to [find and respond to Cobalt Strike beaconing attacks](https://www.elastic.co/blog/bringing-home-the-beacon-cobalt-strike). Additionally, the team provided a detailed how-to article on how to [find beaconing malware with Elastic](https://www.elastic.co/blog/identifying-beaconing-malware-using-elastic).

## Operation Bleeding Bear

Elastic research also recently verified malware attacking the Ukraine government, [Operation Bleeding Bear](https://www.elastic.co/blog/elastic-security-verifies-operation-bleeding-bear). After the vulnerability had been identified publicly, Elastic quickly verified the evasive malware and published research to alert Elastic customers and the security industry as a whole.

## Threats yet discovered…

The Elastic Security Intelligence and Analytics team continues to research and respond to groundbreaking threats in its mission to help Elastic customers and the broader security community. If you’re using [Elastic Security](https://www.elastic.co/security?utm_source=log4j+hub+blog&utm_medium=embed+link&utm_campaign=log4j_hub_blog&utm_id=log4j&utm_content=elastic+security) already, you can expect to see our latest findings in the newsfeed within the platform. We’ll also post our latest findings on [elastic.co/blog](https://www.elastic.co/blog).

Did you know that you can get started with a free [14-day trial of Elastic Cloud](https://cloud.elastic.co/registration?utm_source=log4j+hub+blog&utm_medium=embed+link&utm_campaign=log4j_hub_blog&utm_id=log4j&utm_content=trail)? Or [download](https://www.elastic.co/downloads/?utm_source=log4j+hub+blog&utm_medium=embed+link&utm_campaign=log4j_hub_blog&utm_id=log4j&utm_content=download) the self-managed version of the Elastic Stack for free.
