---
title: "Handy Elastic Tools for the Enthusiastic Detection Engineer"
slug: "handy-elastic-tools-for-the-enthusiastic-detection-engineer"
date: "2022-09-12"
description: "Tools like the EQLPlaygound, RTAs, and detection-rules CLI are great resources for getting started with EQL, threat hunting, and detection engineering respectively."
author:
  - slug: mika-ayenson
image: "security-threat-monitoring-compliance-1200x628.jpg"
category:
tags:
  - python
  - eql
  - rta
  - detection-rules
  - eqlplayground
---

On August 3, we released Protections-artifacts as part of our Openness Initiative 🎉. One of the benefits of producing open and transparent security content is having the opportunity to work with a great community of security experts. In 2020, we discussed opening our detection rules — in continuing with that spirit, here is an inside peek of three available resources we use within Elastic’s Threat Research and Detection Engineering (TRaDE) team to aid our detection engineering research and development workflows.

TRaDE is responsible for the detection and endpoint behavior security rules that power Elastic’s XDR capabilities. While our detection rules provide visibility to adversary behaviors, the endpoint behavior rules have the capability to prevent an attack. These rules provide protection logic used by Elastic Endpoint Security to stop threats on Windows, Linux, and MacOS endpoints. Collectively, Elastic Security supports a wide range of platforms and data sources (e.g., core cloud service providers, K8s, core operating systems, etc.).

The two rulesets: a) detection rules and b) endpoint behavior rules, consider different use cases and complement each other to provide robust coverage. The comparison table highlights unique differences between the two in terms of protection design goals, how data is processed, and which data is processed.

[Detection Rules](https://github.com/elastic/detection-rules/tree/main/rules)- Design Goals: Provide the most robust detection coverage of all threats, leveraging all data sources available. Some tuning of rules based on organization-specific environments is expected. - Data Streams: Will search across all specified indexes per rule within a Stack. - Engine Processing: Batch process.

[Endpoint Behavior](https://github.com/elastic/protections-artifacts/tree/main/behavior)- Design Goals: Provide very high confidence, prevention-focused, minimal tuning at the expense of false negatives on a per-rule basis. We want every organization to be able to enable behavior protection and have a great experience out of the box, with little tuning required. - Data Streams: Agent searches data on the endpoint. - Engine Processing: Real time data streaming.

Behind the TRaDE crafting curtains, we leverage openly available tools to develop and test our rulesets. If you want a primer on writing Event Query Language (EQL) rules, want to generate suspicious activity to baseline your Elastic-powered detections, or quickly export those suspicious events from Elasticsearch, you may benefit from some of the tools we use. Section 1 introduces our security SIEM features via the EQLPlayground, section 2 discusses our rule testing capability RTA, and section 3 highlights our detection-rules CLI and a few valuable commands we use.

# EQLPlayground

[EQL](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql.html) was developed to express relationships between events, and, coupled with [ECS](https://www.elastic.co/guide/en/ecs/current/index.html), has the power to quickly correlate events across disparate data sources. Whether you want to perform a simple search with EQL, leverage advanced data stacking and filtering to discover anomalies, or define a complex hypothesis-based hunt query, EQL’s flexibility as a language can help improve your team’s effectiveness in many ways. The language is heavily [used](https://cs.github.com/elastic/detection-rules?q=language+%3D+%22eql%22+path%3A%2F%5Erules%5C%2F%2F) (in addition to several other language options, enabling users to leverage the most relevant and applicable features) throughout our [detection-rules repo](https://github.com/elastic/detection-rules) and [endpoint behavior artifacts](https://github.com/elastic/protections-artifacts/tree/main/behavior) to detect adversary behaviors and express relationships between events.

![EQL overview diagram](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image5.png)

While we strive to achieve feature parity between endpoint and elasticsearch EQL implementations to the extent possible, there are minor functional differences due to architectural implementations.

While reading about EQL can be very informative, playing with the query language is a much more fun and interactive learning experience! Thanks to Elastic’s own [James Spiteri](https://www.linkedin.com/in/jamesspiteri/), you can immediately dive into an Elastic Cloud Stack and learn using the [EQLPlaygound](<https://eqlplayground.io/s/eqldemo/app/security/timelines/default?sourcerer=(default:(id:security-solution-eqldemo,selectedPatterns:!(eqldemo,%27logs-endpoint.*-eqldemo%27,%27logs-system.*-eqldemo%27,%27logs-windows.*-eqldemo%27,metricseqldemo)))&timerange=(global:(linkTo:!(),timerange:(from:%272022-05-29T22:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272022-05-30T21:59:59.999Z%27,toStr:now%2Fd)),timeline:(linkTo:!(),timerange:(from:%272022-04-17T22:00:00.000Z%27,kind:absolute,to:%272022-04-18T21:59:59.999Z%27)))&timeline=(activeTab:eql,graphEventId:%27%27,id:%279844bdd4-4dd6-5b22-ab40-3cd46fce8d6b%27,isOpen:!t)>). The playground takes advantage of the native Security [Timeline](https://www.elastic.co/guide/en/security/current/timelines-ui.html) correlation capabilities, and provides notes to enable learning EQL. The playground is a publicly available Elastic Security instance, pre-populated with suspicious events generated from a Sofacy group [payload](https://unit42.paloaltonetworks.com/unit42-sofacy-attacks-multiple-government-entities/). The only thing you need to access the site is a browser!

![EQLPlayground](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image3.png)

Essentially, you’re presented with a dataset representative of threat activity, similar to what we rely on to build our detection rules and endpoint artifacts. This event data can then be leveraged to generate your own detection logic. It also provides a small introduction to the Elastic Security Stack, and gives you an opportunity to play with some of the cool features available (e.g. Analyzer). The visual event [Analyzer](https://www.elastic.co/guide/en/security/current/visual-event-analyzer.html) shows a graphical representation of a process tree, containing alerts and suspicious events detected by our Elastic Security Endpoint, and illustrates process lineage that can be used within a query.

![Security app Analyzer interface](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image2.png)

We can use this information to understand how the adversary behavior works, and develop a query capable of identifying future malicious activity. For example, should Outlook spawn an explorer.exe child process? Explore the EQLPlayground, EQL [syntax](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html), and [APIs](https://www.elastic.co/guide/en/elasticsearch/reference/8.3/eql-apis.html). In the correlation view [introduced](https://www.elastic.co/blog/whats-new-elastic-security-7-12-0-analyst-driven-correlation-ransomware-prevention) with Elastic Security 7.12, you’ll have the opportunity to insert EQL and develop a query with your special sauce to detect the malicious behavior we’ve executed. You’ll also be able to look at each available field, and the data stream required to capture these events within your Stack.

![Security app Timeline correlation interface](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image4.png)

As you can see, there is an example placeholder query, but you have full access to modify the query based on the full event captured and come up with the best detection. Is there something suspicious about the process tree? What about the sequence of events? Is there something fishy about rundll32.exe (a commonly used [execution proxy](https://attack.mitre.org/techniques/T1218/011/)) making external network calls?

```
sequence by process.entity_id with maxspan=10s
[process where process.name : "rundll32.exe" and event.type == "start"]
[network where process.name : "rundll32.exe" and not cidrmatch(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8")]
```

We’d love to see what cool and clever queries you’ve come up with, and if you have ideas for new rules, check out our [CONTRIBUTING.md](https://github.com/elastic/detection-rules/blob/main/CONTRIBUTING.md) guide and submit a [new rule](https://github.com/elastic/detection-rules/issues/new?assignees=&labels=Rule%3A+New&template=new_rule.md&title=%5BNew+Rule%5D+Name+of+rule). For now, we’ll use this query in creating a rule with the detection-rule CLI.

# Red Team Automation (RTA)

One of the ways we automate testing Elastic’s ruleset is by launching RTA scripts that simulate threat behaviors. If you are unfamiliar with RTA, it is an open-source tool used by TRaDE to generate suspicious activity and unit test rules across multiple Stack releases. We encourage you to check out the [2018 post](https://www.elastic.co/blog/introducing-endgame-red-team-automation) by [Devon Kerr,](https://www.linkedin.com/in/devonkerr/) which introduced the capability.

Sometimes folks ask our team for sample data, methods to generate suspicious events to baseline configurations, or a testing environment with many alerts already generated in the Elastic Stack. We also regression test rules to validate new features added to the SIEM or Endpoint agent, any modifications based on rule tuning, or for maintenance. This process can become time-consuming with hundreds of rules to test across multiple Stack versions.

In the latest 8.4 dev cycle, we spent some time generating new macOS, Linux, and Windows RTAs. Consistent with the openness theme, we migrated our endpoint behavior tests to the Detection Rules [repo](https://github.com/elastic/detection-rules/tree/main/rta) for the community! Current RTA development is focused on endpoint behavior, and we continue to expand the coverage of our rulesets with new RTAs, so look forward to even more RTAs in the not-too-distant future.

![Cloning RTA](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/cloning_rta.jpg)

Once you’ve cloned the detection-rules repo, you’ll be able to list all available tests. Each RTA includes helpful metadata like the platform the RTA supports, the triggered rules that will alert, and the python code that generates suspicious activity on the target system. The [common](https://github.com/elastic/detection-rules/blob/main/rta/common.py) import is packed with useful functions to simplify creating new RTAs. For example, it provides helper functionality to temporarily edit the Windows registry, check the required operating system is running the RTA, or even execute terminal commands. Essentially, it abstracts a lot of the common activity needed across the RTA set in order to simplify the development of new RTAs, especially for those less familiar with python. The RTA library was designed to use only stdlib Python packages so that no external dependencies would be required. Using only core libraries is greatly beneficial when testing in segmented environments.

![Sample RTA edmond_child_process.py](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image_8.jpg)

In the above example, the RTA generates activity to trigger the [Suspicious Emond Child Process](https://github.com/elastic/detection-rules/blob/main/rules/macos/persistence_emond_rules_process_execution.toml) SIEM and [Potential Persistence via Emond](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/persistence_potential_persistence_via_emond.toml) endpoint behavior rules. The RTA creates a bash shell process spawned from a parent process called emond. We aim to make repeatable yet non-destructive test cases to reuse testing infrastructure as much as possible between unit tests. There are many approaches to generating suspicious events that would trigger these rules, so if you’d like to contribute your creative ideas, feel free to submit a pull request to the [detection-rules](https://github.com/elastic/detection-rules)!

# Detection Rules CLI

The detection-rules CLI is a development tool swiss-army-knife that we use to manage and test whether our rules pass validation, but there are useful commands that you can use to speed up rule testing in your own environment. If you’re familiar with Python3, getting started with the Detection Rules CLI commands will only take a few steps. It has useful commands like `view-rule` , which shows the rule as a JSON object in the format expected by Kibana. Conveniently, the command also validates while loading; if you ever want to test that your TOML file matches our schema quickly, you can use this command.

![Detection Rules CLI setup](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image_9.jpg)

After you have installed the package [dependencies](https://github.com/elastic/detection-rules#getting-started) and your credential configuration, you’re ready to use the CLI. One of the cool things about using the CLI is the ability to download data while testing an RTA using the `collect-events` command.

![Detection Rules CLI collect-events function](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image_10.jpg)

Once you start collecting events, the CLI command will idle until you're ready to save events. While you wait, you have an opportunity to jump onto the target machine, execute an RTA, detonate a malware sample, or launch any payloads to trigger an alert. These events can be stored offline and reused later in an automated testing process. With the collect-events command, you can apply several options that scope your exports, like specifying the index and specific [host.id](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-id) of the target system you want. Once the command starts, it gathers all events associated with the host until you’re ready to stop the collection.

![Detection Rules CLI collect-events in action](/assets/images/handy-elastic-tools-for-the-enthusiastic-detection-engineer/image6.gif)

As you can see, it’s possible to run the `collect-events` command, generate malicious activity on a target system (e.g., using an RTA), and download the events locally for review. Some users export and use these events as-is, but we intend to store these events to help automate and streamline our end-to-end testing process.

Apart from the `es` (Elasticsearch) function, we often use several other options like linting our ruleset with `toml-lint` , validating our rules with `validate-all` , or even surveying out ruleset against alerts with in-development commands buried deep within our dev CLI section like `rule-survey`. If you’re interested in reading more about the other fields available, see our guide on [creating a rule with the CLI](https://github.com/elastic/detection-rules/blob/main/CONTRIBUTING.md#creating-a-rule-with-the-cli) or the [CLI.md](https://github.com/elastic/detection-rules/blob/main/CLI.md). As always, if you have any questions or need help, feel free to submit an issue.

Tools like the EQLPlaygound, RTAs, and detection-rules CLI are great resources for getting started with EQL, threat hunting, and detection engineering respectively. Coupled with the detection-rules CLI and RTAs, these tools give security research engineers immediate feedback to begin managing their custom Elastic detection rules. Whether you’re using a cloud Elastic Stack, a local deployment, or are setting up a lab environment with our newly released [Elastic Container Project](https://www.elastic.co/security-labs/the-elastic-container-project), we’ve got you covered. These are just a few tools we use that you're welcome to try out for your internal workflows, they help us test and create rules every day.

In a following article of TRaDE craft, we’ll describe how we validate our rules across languages like EQL or KQL, and how we automate our end-to-end process. Additionally, if you’re interested in hearing how our partners at Tines have integrated Elastic detection logic, check out their blog on [Automating Detection-as-Code](https://www.tines.com/blog/automating-detection-as-code), which walks through the Elastic SIEM, detection content development CI/CD, alert management, and response handling.

We’re always interested in hearing use cases and workflows like these, so as always, reach out to us via [GitHub issues](https://github.com/elastic/protections-artifacts/issues), chat with us in our [community Slack](http://ela.st/slack), and ask questions in our [Discuss forums](https://discuss.elastic.co/c/security/endpoint-security/80)!
