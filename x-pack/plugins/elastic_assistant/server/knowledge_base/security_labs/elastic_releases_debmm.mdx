---
title: "Elastic releases the Detection Engineering Behavior Maturity Model"
slug: "elastic-releases-debmm"
date: "2024-09-06"
subtitle: "Improving detection engineering with Elastic's DEBMM."
description: "Using this maturity model, security teams can make structured, measurable, and iteritive improvements to their detection engineering teams.."
author:
  - slug: mika-ayenson
  - slug: terrance-dejesus
  - slug: samir-bousseaden
image: "debmm.jpg"
category:
  - slug: detection-science
  - slug: security-operations
tags:
  - detection engineering
  - detections as code
  - debmm
---

## Detection Engineering Behavior Maturity Model

At Elastic, we believe security is a journey, not a destination. As threats evolve and adversaries become more effective, security teams must continuously adapt and improve their processes to stay ahead of the curve. One of the key components of an effective security program is developing and managing threat detection rulesets. These rulesets are essential for identifying and responding to security incidents. However, the quality and effectiveness of these rulesets are directly influenced by the processes and behaviors of the security team managing them.

To address the evolving challenges in threat detection engineering and ensure consistent improvement across security teams, we have defined the **Detection Engineering Behavior Maturity Model (DEBMM)**. This model, complemented by other models and frameworks, provides a structured approach for security teams to consistently mature their processes and behaviors. By focusing on the team's processes and behaviors, the model ensures that detection rulesets are developed, managed, and improved effectively, regardless of the individual or the specific ruleset in question. This approach promotes a culture of continuous improvement and consistency in threat detection capabilities.

![Detection Engineering Behavior Maturity Model](/assets/images/elastic-releases-debmm/image5.png "Detection Engineering Behavior Maturity Model")

The Detection Engineering Behavior Maturity Model outlines five maturity tiers (Foundation, Basic, Intermediate, Advanced, and Expert) for security teams to achieve. Each tier builds upon the previous one, guiding teams through a structured and iterative process of enhancing their behaviors and practices. While teams may demonstrate behaviors at different tiers, skipping or deprioritizing criteria at the prior tiers is generally not recommended. Consistently meeting the expectations at each tier is crucial for creating a solid foundation for progression. However, measuring maturity over time becomes challenging as threats and technologies evolve, making it difficult to define maturity in an evergreen way. This model emphasizes continuous improvement rather than reaching a fixed destination, reflecting the ongoing nature of security work. 

Note it is possible, and sometimes necessary, to attempt the behaviors of a higher tier in addition to the behaviors of your current tier. For example, attempting to enhance Advanced TTP Coverage may cover an immediate risk or threat, further cultivating expertise among engineers at the basic level.  This flexibility ensures that security teams can prioritize critical improvements and adapt to evolving threats without feeling constrained by the need to achieve perfection at each level. The dual dimensions of maturity ensure a balanced approach, fostering a culture of ongoing enhancement and adaptability. Additionally, the model is designed to complement well-adopted frameworks in the security domain, adding unique value by focusing on the maturity of the team's processes and behaviors that underpin effective detection ruleset management. 

|                       Model/Framework                       |                                                  Focus                                                 |                                                                                                                                                 Contribution of the DEBMM                                                                                                                                                |
|:-----------------------------------------------------------:|:------------------------------------------------------------------------------------------------------:|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| Hunting Maturity Model [[REF](https://www.sans.org/tools/hunting-maturity-model/)]                                | Proactive threat hunting practices and processes for improving threat detection capabilities.          | Enhances the proactive aspects by integrating regular and systematic threat-hunting activities into the ruleset development and management process.                                                                                                                                                                      |
| NIST Cybersecurity Framework (NIST CSF) [[REF](https://www.nist.gov/cyberframework)]               | Identifying, Protecting, Detecting, Responding, and Recovering from cybersecurity threats.             | Enhances the 'Detect' function by offering a structured model specifically for detection ruleset maturity, aligning with NIST CSF's core principles and providing detailed criteria and measures for detection capabilities. It also leverages the Maturity Levels—initial, Repeatable, Defined, Managed, and Optimized. |
| MITRE ATT&CK Framework [[REF](https://attack.mitre.org/)]                                | Describes common tactics, techniques, and procedures (TTPs) threat actors use.                         | Supports creating, tuning, and validating detection rules that align with TTPs, ensuring comprehensive threat coverage and effective response mechanisms.                                                                                                                                                                |
| ISO/IEC 27001 [[REF](https://www.iso.org/obp/ui/en/#iso:std:iso-iec:27001:ed-3:v1:en)]                                         | Information security management systems (ISMS) and overall risk management.                            | Contributes to the 'Detect' and 'Respond' domains by ensuring detection rules are systematically managed and continuously improved as part of an ISMS.                                                                                                                                                                   |
| SIM3 v2 – Security Incident Management Maturity Model [[REF](https://opencsirt.org/wp-content/uploads/2023/11/SIM3_v2_interim_standard.pdf)] | Maturity of security incident management processes.                                                    | Integrates structured incident management practices into detection ruleset management, ensuring clear roles, documented procedures, effective communication, and continuous improvement.                                                                                                                                 |
| Detection Engineering Maturity Matrix [[REF](https://detectionengineering.io)]                 | Defines maturity levels for detection engineering, focusing on processes, technology, and team skills. | Provides behavioral criteria and a structured approach to improving detection engineering processes.                                                                                                                                                                                                                     |

Among the several references listed in the table, the Detection Engineering Maturity Matrix is the closest related, given its goals and methodologies. The matrix defines precise maturity levels for processes, technology, and team skills, while the DEBMM builds on this foundation by emphasizing continuous improvement in engineering behaviors and practices. Together, they offer a comprehensive approach to advancing detection engineering capabilities, ensuring structural and behavioral excellence in managing detection rulesets while describing a common lexicon.

**A Small Note on Perspectives and the Importance of the Model**

Individuals with diverse backgrounds commonly perform detection engineering. People managing detecting engineering processes must recognize and celebrate the value of diverse backgrounds; DEBMM is about teams of individuals, vendors, and users, each bringing different viewpoints to the process. This model lays the groundwork for more robust frameworks to follow, complementing existing ones previously mentioned while considering other perspectives.

### What is a threat detection ruleset?

Before we dive into the behaviors necessary to mature our rulesets, let's first define the term. A threat detection ruleset is a group of rules that contain information and some form of query logic that attempts to match specific threat activity in collected data. These rules typically have a schema, information about the intended purpose, and a query formatted for its specific query language to match threat behaviors. Below are some public examples of threat detection rulesets:

* Elastic:  [Detection Rules](https://github.com/elastic/detection-rules) | [Elastic Defend Rules](https://github.com/elastic/protections-artifacts)
* Sigma: [Sigma Rules](https://github.com/SigmaHQ/sigma)
* DataDog: [Detection Rules](https://docs.datadoghq.com/security/detection_rules/)
* Splunk: [Detections](https://research.splunk.com/detections/)
* Panther: [Detection Rules](https://github.com/panther-labs/panther-analysis)

Detection rulesets often fall between simple Indicator of Compromise (IOC) matching and programmable detections, such as those written in Python for Panther. They balance flexibility and power, although they are constrained by the detection scripting language's design biases and the detection engine's features. It is important to note that this discussion is focused on search-based detection rules typically used in SIEM (Security Information and Event Management) systems. Other types of detections, including on-stream and machine learning-based detections, can complement SIEM rules but are not explicitly covered by this model.

Rulesets can be further categorized based on specific criteria. For example, one might assess the Amazon Web Services (AWS) ruleset in Elastic’s Detection Rules repository rather than rules based on all available data sources. Other categories might include all cloud-related rulesets, credential access rulesets, etc.

### Why ruleset maturity is important

**Problem:** It shouldn't matter which kind of ruleset you use; they all benefit from a system that promotes effectiveness and rigor. The following issues are more prominent if you're using an ad-hoc or nonexistent system of maturity:

* SOC Fatigue and Low Detection Accuracy: The overwhelming nature of managing high volumes of alerts, often leading to burnout among SOC analysts, is compounded by low-fidelity detection logic and high false positive (FP) rates, resulting in a high number of alerts that are not actual threats and do not accurately identify malicious activity.
* Lack of Contextual Information and Poor Documentation: Detection rules that trigger alerts without sufficient contextual information to understand the event's significance or lack of guidance for the course of action, combined with insufficient documentation for detection rules, including their purpose, logic, and expected outcomes.
* Inconsistent Rule Quality: Variability in the quality and effectiveness of detection rules.
* Outdated Detection Logic: Detection rules must be updated to reflect the latest threat intelligence and attack techniques.
* Overly Complex Rules: Detection rules that are too complex, making them difficult to maintain and understand.
* Lack of Automation: Reliance on manual processes for rule updates, alert triage, and response.
* Inadequate Testing and Validation: Detection rules must be thoroughly tested and validated before deployment.
* Inflexible Rulesets: Detection rules that are not adaptable to environmental changes or new attack techniques.
* Lack of Metrics, Measurement, and Coverage Insights: More metrics are needed to measure the effectiveness, performance, and coverage of detection rules across different areas.
* Siloed Threat Intelligence: Threat intelligence must be integrated with detection rules, leading to fragmented and incomplete threat detection.
* Inability to Prioritize New Rule Creation: Without a maturity system, teams might focus on quick wins or more exciting areas rather than what is needed.

**Opportunity:** This model encourages a structured approach to developing, managing, improving, and maintaining quality detection rulesets, helping security teams to:

* Reduce SOC fatigue by optimizing alert volumes and improving accuracy.
* Enhance detection fidelity with regularly updated and well-tested rules.
* Ensure consistent and high-quality detection logic across the entire ruleset.
* Integrate contextual information and threat intelligence for more informed alerting.
* Automate routine processes to improve efficiency and reduce manual errors.
* Continuously measure and improve the performance of detection rules.
* Stay ahead of threats, maintain effective detection capabilities, and enhance their overall security posture.

### Understanding the DEBMM Structure

DEBMM is segmented into **tiers** related to **criteria** to **quantitatively and qualitatively** convey maturity across different **levels**, each contributing to clear progression outcomes. It is designed to guide security teams through a structured set of behaviors to develop, manage, and maintain their detection rulesets.

![DEBMM Tier Structure](/assets/images/elastic-releases-debmm/image2.png "DEBMM Tier Structure")

#### Tiers

The DEBMM employs a multidimensional approach to maturity, encompassing both high-level tiers and granular levels of behaviors within each tier. The first dimension involves the overall maturity tiers, where criteria should be met progressively to reflect overall maturity. The second dimension pertains to the levels of behaviors within each tier, highlighting specific practices and improvements that convey maturity. This structure allows for flexibility and recognizes that maturity can be demonstrated in various ways. The second dimension loosely aligns with the NIST Cybersecurity Framework (CSF) maturity levels (Initial, Repeatable, Defined, Managed, and Optimized), providing a _familiar reference point_ for security teams. For instance, the qualitative behaviors and quantitative measurements within each DEBMM tier mirror the iterative refinement and structured process management advocated by the NIST CSF. By aligning with these principles, the DEBMM ensures that as teams progress through its tiers, they also embody the best practices and structured approach seen in the NIST CSF.

At a high level, the DEBMM consists of five maturity tiers, each building upon the previous one:

1. **Tier 0: Foundation** - No structured approach to rule development and management. Rules are created and maintained ad-hoc, with little documentation, peer review, stakeholder communication, or personnel training.
2. **Tier 1: Basic** - Establishment of baseline rules, systematic rule management, version control, documentation, regular reviews of the threat landscape, and initial personnel training.
3. **Tier 2: Intermediate** - Focus on continuously tuning rules to reduce false positives, identifying and documenting gaps, thorough internal testing and validation, and ongoing training and development for personnel.
4. **Tier 3: Advanced** - Systematic identification and ensuring that legitimate threats are not missed (false negatives), engaging in external validation of rules, covering advanced TTPs, and advanced training for analysts and security experts.
5. **Tier 4: Expert** - This level is characterized by advanced automation, seamless integration with other security tools, continuous improvement through regular updates and external collaboration, and comprehensive training programs for all levels of security personnel. Proactive threat hunting plays a crucial role in maintaining a robust security posture. It complements the ruleset, enhancing the management process by identifying new patterns and insights that can be incorporated into detection rules. Additionally, although not commonly practiced by vendors, detection development as a post-phase of incident response can provide valuable insights and enhance the overall effectiveness of the detection strategy.

It's ideal to progress through these tiers following an approach that best meets the security team's needs (e.g., sequentially, prioritizing by highest risk, etc.). Progressing through the tiers comes with increased operational costs, and rushing through the maturity model without proper budget and staff can lead to burnout and worsen the situation. Skipping foundational practices in the lower tiers can undermine the effectiveness of more advanced activities in the higher tiers.

Consistently meeting the expectations at each tier ensures a solid foundation for moving to the next level. Organizations should strive to iterate and improve continuously, recognizing that maturity is dynamic. The expert level represents an advanced state of maturity, but it is not the final destination. It requires ongoing commitment and adaptation to stay at that level. Organizations may experience fluctuations in their maturity level depending on the frequency and accuracy of assessments. This is why the focus should be on interactive development and recognize that different maturity levels within the tiers may be appropriate based on the organization's specific needs and resources. 

#### Criteria and Levels

Each tier is broken down into specific criteria that security teams must meet. These criteria encompass various aspects of detection ruleset management, such as rule creation, management, telemetry quality, threat landscape review, stakeholder engagement, and more.

Within each criterion, there are qualitative behaviors and quantitative measurements that define the levels of maturity:

* **Qualitative Behaviors—State of Ruleset:** These subjective assessments are based on the quality and thoroughness of the ruleset and its documentation. They provide a way to evaluate the current state of the ruleset, helping threat researchers and detection engineers **understand and articulate the maturity of their ruleset in a structured manner. While individual perspectives can influence these behaviors and may vary between assessors, they are helpful for initial assessments and for providing detailed insights into the ruleset's state.
* **Quantitative Measurements - Activities to Maintain State**: These provide a structured way to measure the activities and processes that maintain or improve the ruleset. They are designed to be more reliable for comparing the maturity of different rulesets and help track progress over time. While automation can help measure these metrics consistently, reflecting the latest state of maturity, each organization needs to define the ideal for its specific context. The exercise of determining and calculating these metrics will contribute significantly to the maturity process, ensuring that the measures are relevant and tailored to the unique needs and goals of the security team. Use this model as guidance, but establish and adjust specific calculations and metrics according to your organizational requirements and objectives. 

Similar to Tiers, each level within the qualitative and quantitative measurements builds upon the previous one, indicating increasing maturity and sophistication in the approach to detection ruleset management. The goal is to provide clear outcomes and a roadmap for security teams to systematically and continuously improve their detection rulesets.

#### Scope of Effort to Move from Basic to Expert

Moving from the basic to the expert tier involves a significant and sustained effort. As teams progress through the tiers, the complexity and depth of activities increase, requiring more resources, advanced skills, and comprehensive strategies. For example, transitioning from Tier 1 to Tier 2 involves systematic rule tuning and detailed gap analysis, while advancing to Tier 3 and Tier 4 requires robust external validation processes, proactive threat hunting, and sophisticated automation. This journey demands commitment, continuous learning, and adaptation to the evolving threat landscape.

#### Tier 0: Foundation 

Teams must build a structured approach to rule development and management at the foundational tier. Detection rules may start out being created and maintained ad hoc, with little to no peer review, and often needing proper documentation and stakeholder communication. Threat modeling initially rarely influences the creation and management of detection rules, resulting in a reactive rather than proactive approach to threat detection. Additionally, there may be little to no roadmap documented or planned for rule development and updates, leading to inconsistent and uncoordinated efforts.

Establishing standards for what defines a good detection rule is essential to guiding teams toward higher maturity levels. It is important to recognize that a rule may not be perfect in its infancy and will require continuous improvement over time. This is acceptable if analysts are committed to consistently refining and enhancing the rule. We provide recommendations on what a good rule looks like based on our experience, but organizations must define their perfect rule considering their available capabilities and resources.

Regardless of the ruleset, a rule should include specific fields that ensure its effectiveness and accuracy. Different maturity levels will handle these fields with varying completeness and accuracy. While more content provides more opportunities for mistakes, the quality of a rule should improve with the maturity of the ruleset. For example, a better query with fewer false positives, more descriptions with detailed information, and up-to-date MITRE ATT&CK information are indicators of higher maturity.

By establishing and progressively improving these criteria, teams can enhance the quality and effectiveness of their detection rulesets. Fundamentally, it starts with developing, managing, and maintaining a single rule. Creating a roadmap for rule development and updates, even at the most basic level, can provide direction and ensure that improvements are systematically tracked and communicated. Most fields should be validated against a defined schema to provide consistency. For more details, see the [Example Rule Fields](#Example-Rule-Metadata).

![DEBMM - Tier 0](/assets/images/elastic-releases-debmm/image6.png "DEBMM - Tier 0")

##### Criteria

###### Structured Approach to Rule Development and Management

* Qualitative Behaviors - State of Ruleset:
    * Initial: No structured approach; rules created randomly without documentation.
    * Repeatable: Minimal structure; some rules are created with primary documentation.
    * Defined: Standardized process for rule creation with detailed documentation and alignment with defined schemas.
    * Managed: Regularly reviewed and updated rules, ensuring consistency and adherence to documented standards, with stakeholder involvement.
    * Optimized: Continuous improvement based on feedback and evolving threats, with automated rule creation and management processes.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No formal activities for rule creation.
    * Repeatable: Sporadic creation of rules with minimal oversight or review; less than 20% of rules have complete documentation; less than 10% of rules are aligned with a defined schema; rules created do not undergo any formal approval process.
    * Defined: Regular creation and documentation of rules, with 50-70% alignment to defined schemas and peer review processes.
    * Managed: Comprehensive creation and management activities, with 70-90% of rules having complete documentation and formal approval processes.
    * Optimized: Fully automated and integrated rule creation and management processes, with 90-100% alignment to defined schemas and continuous documentation updates.

###### Creation and Maintenance of Detection Rules

* Qualitative Behaviors - State of Ruleset:
    * Initial: Rules created and modified ad hoc, without version control.
    * Repeatable: Occasional updates to rules, but still need a systematic process.
    * Defined: Systematic process for rule updates, including version control and regular documentation.
    * Managed: Regular, structured updates with detailed documentation, version control, and stakeholder communication.
    * Optimized: Continuous rule improvement with automated updates, comprehensive documentation, and proactive stakeholder engagement.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No formal activities are required to maintain detection rules.
    * Repeatable: Rules are updated sporadically, with less than 50% of rules reviewed annually; more than 30% of rules have missing or incomplete descriptions, references, or documentation; less than 20% of rules are peer-reviewed; less than 20% of rules include escalation procedures or guides; less than 15% of rules have associated metadata for tracking rule effectiveness and modifications.
    * Defined: Regular updates with 50-70% of rules reviewed annually; detailed descriptions, references, and documentation for most rules; 50% of rules are peer-reviewed.
    * Managed: Comprehensive updates with 70-90% of rules reviewed annually; complete descriptions, references, and documentation for most rules; 70% of rules are peer-reviewed.
    * Optimized: Automated updates with 90-100% of rules reviewed annually; thorough descriptions, references, and documentation for all rules; 90-100% of rules are peer-reviewed and include escalation procedures and guides.

###### Roadmap Documented or Planned

* Qualitative Behaviors - State of Ruleset:
    * Initial: No roadmap documented or planned for rule development and updates.
    * Repeatable: A basic roadmap exists for some rules, with occasional updates and stakeholder communication.
    * Defined: A comprehensive roadmap is documented for most rules, with regular updates and stakeholder involvement.
    * Managed: Detailed, regularly updated roadmap covering all rules, with proactive stakeholder communication and involvement.
    * Optimized: Dynamic, continuously updated roadmap integrated into organizational processes, with full stakeholder engagement and alignment with strategic objectives.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No documented roadmap for rule development and updates.
    * Repeatable: Basic roadmap documented for less than 30% of rules; fewer than two roadmap updates or stakeholder meetings per year; less than 20% of rules have a planned update schedule; no formal process for tracking roadmap progress.
    * Defined: Roadmap documented for 50-70% of rules; regular updates and stakeholder meetings; 50% of rules have a planned update schedule.
    * Managed: Comprehensive roadmap for 70-90% of rules; frequent updates and stakeholder meetings; 70% of rules have a planned update schedule and tracked progress.
    * Optimized: Fully integrated roadmap for 90-100% of rules; continuous updates and proactive stakeholder engagement; 90-100% of rules have a planned update schedule with formal tracking processes.

###### Threat Modeling Performed

* Qualitative Behaviors - State of Ruleset:
    * Initial: No threat modeling was performed.
    * Repeatable: Occasional, ad-hoc threat modeling with minimal impact on rule creation without considering data and environment specifics.
    * Defined: Regular threat modeling with structured processes influencing rule creation, considering data and environment specifics.
    * Managed: Comprehensive threat modeling integrated into rule creation and updates, with detailed documentation and stakeholder involvement.
    * Optimized: Continuous, proactive threat modeling with real-time data integration, influencing all aspects of rule creation and management with full stakeholder engagement.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No formal threat modeling activities.
    * Repeatable: Sporadic threat modeling efforts; less than one threat modeling exercise conducted per year with minimal documentation or impact analysis; threat models are reviewed or updated less than twice a year; less than 10% of new rules are based on threat modeling outcomes, and data and environment specifics are not consistently considered.
    * Defined: Regular threat modeling efforts; one to two annual exercises with detailed documentation and impact analysis; threat models reviewed or updated quarterly; 50-70% of new rules are based on threat modeling outcomes.
    * Managed: Comprehensive threat modeling activities; three to four exercises conducted per year with thorough documentation and impact analysis; threat models reviewed or updated bi-monthly; 70-90% of new rules are based on threat modeling outcomes.
    * Optimized: Continuous threat modeling efforts; monthly exercises with real-time documentation and impact analysis; threat models reviewed or updated continuously; 90-100% of new rules are based on threat modeling outcomes, considering data and environment specifics.

#### Tier 1: Basic

The basic tier involves creating a baseline of rules to cover fundamental threats. This includes differentiating between baseline rules for core protection and other supporting rules. Systematic rule management, including version control and documentation, is established. There is a focus on improving and maintaining telemetry quality and reviewing threat landscape changes regularly. At Elastic, we have always followed a Detections as Code (DAC) approach to rule management, which has helped us maintain our rulesets. We have recently exposed some of our internal capabilities and [documented core DAC principles](https://dac-reference.readthedocs.io/en/latest/) for the community to help improve your workflows.

![DEBMM - Tier 1](/assets/images/elastic-releases-debmm/image8.png "DEBMM - Tier 1")

##### Criteria

**Creating a Baseline**

Creating a baseline of rules involves developing a foundational set of rules to cover basic threats. This process starts with understanding the environment and the data available, ensuring that the rules are tailored to the specific needs and capabilities of the organization. The focus should be on critical tactics such as initial access, execution, persistence, privilege escalation, command & control, and critical assets determined by threat modeling and scope. A baseline is defined as the minimal rules necessary to detect critical threats within these tactics or assets, recognizing that not all techniques may be covered. Key tactics are defined as the initial stages of an attack lifecycle where attackers gain entry, establish a foothold, and escalate privileges to execute their objectives. Major threats are defined as threats that can cause significant harm or disruption to the organization, such as ransomware, data exfiltration, and unauthorized access. Supporting rules, such as Elastic’s Building Block Rules (BBR), help enhance the overall detection capability. 

Given the evolution of SIEM and the integration of Endpoint Detection and Response (EDR) solutions, there is an alternative first step for users who utilize an EDR. Only some SIEM users have an EDR, so this step may only apply to some, but organizations should validate that their EDR provides sufficient coverage of basic TTPs. Once this validation is complete, you may supplement that coverage for specific threats of concern based on your environment. Identify high-value assets and profile what typical host and network behavior looks like for them. Develop rules to detect deviations, such as new software installations or unexpected network connections, to ensure a comprehensive security posture tailored to your needs.

Comprehensive documentation goes beyond basic descriptions to include detailed explanations, investigative steps, and context about each rule. For example, general documentation states the purpose of a rule and its query logic. In contrast, comprehensive documentation provides an in-depth analysis of the rule's intent, the context of its application, detailed steps for investigation, potential false positives, and related rules. Comprehensive documentation ensures that security analysts have all the necessary information to effectively utilize and maintain the rule, leading to more accurate and actionable detections. 

It would begin with an initial context explaining the technology behind the rule, outlining the risks and why the user should care about them, and detailing what the rule does and how it operates. This would be followed by possible investigation steps, including triage, scoping, and detailed investigation steps to analyze the alert thoroughly. A section on false positive analysis also provides steps to identify and mitigate false positives, ensuring the rule's accuracy and reliability. The documentation would also list related rules, including their names and IDs, to provide a comprehensive view of the detection landscape. Finally, response and remediation actions would be outlined to guide analysts in containing, remediating, and escalating the alert based on the triage results, ensuring a swift and effective response to detected threats. Furthermore, a setup guide section would be added to explain any prerequisite setup information needed to properly function, ensuring that users have all the necessary configuration details before deploying the rule.

* Qualitative Behaviors - State of Ruleset:
    * Initial: A few baseline rules are created to set the foundation for the ruleset.
    * Repeatable: Some baseline rules were created covering key tactics (initial access, execution, persistence, privilege escalation, and command and control) for well-documented threats.
    * Defined: Comprehensive baseline rules covering significant threats (e.g., ransomware, data exfiltration, unauthorized access) created and documented.
    * Managed: Queries and rules are validated against the defined schema that aligns with the security product before release.
    * Optimized: Continuous improvement and fine-tuning baseline rules with advanced threat modeling and automation.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: 5-10 baseline rules created and documented per ruleset (e.g., AWS S3 ruleset, AWS Lambda ruleset, Azure ruleset, Endpoint ruleset).
    * Repeatable: More than ten baseline rules are created and documented per ruleset, covering major techniques based on threat modeling (e.g., probability of targeting, data source availability, impact on critical assets); at least 10% of rules go through a diagnostic phase.
    * Defined: A significant percentage (e.g., 60-70%) baseline of ATT&CK techniques covered per data source​​; 70-80% of rules tested as diagnostic (beta) rules before production; regular updates and validation of rules.
    * Managed: 90% or more of baseline ATT&CK techniques covered per data source; 100% of rules undergo a diagnostic phase before production; comprehensive documentation and continuous improvement processes are in place.
    * Optimized: 100% coverage of baseline ATT&CK techniques per data source; automated diagnostic and validation processes for all rules; continuous integration and deployment (CI/CD) for rule updates.

###### Managing and Maintaining Rulesets

A systematic approach to managing and maintaining rules, including version control, documentation, and validation.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No rule management.
    * Repeatable: Occasional rule processes with some documentation and a recurring release cycle for rules.
    * Defined: Regular rule management with comprehensive documentation and version control.
    * Managed: Applies a Detections as Code (schema validation, query validation, versioning, automation, etc.) approach to rule management.
    * Optimized: Advanced automated processes with continuous weekly rule management and validation; complete documentation and version control for all rules.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No rule management activities.
    * Repeatable: Basic rule management activities are conducted quarterly; less than 20% of rules have version control.
    * Defined: Regular rule updates and documentation are conducted monthly; 50-70% of rules have version control and comprehensive documentation.
    * Managed: Automated processes for rule management and validation are conducted bi-weekly; 80-90% of rules are managed using Detections as Code principles.
    * Optimized: Advanced automated processes with continuous weekly rule management and validation; 100% of rules managed using Detections as Code principles, with complete documentation and version control.

###### Improving and Maintaining Telemetry Quality

Begin conversations and develop relationships with teams managing telemetry data. This applies differently to various security teams: for vendors, it may involve data from all customers; for SOC or Infosec teams, it pertains to company data; and for MSSPs, it covers data from managed clusters. Having good data sources is crucial for all security teams to ensure the effectiveness and accuracy of their detection rules. This also includes incorporating cyber threat intelligence (CTI) workflows to enrich telemetry data with relevant threat context and indicators, improving detection capabilities. Additionally, work with your vendor and align your detection engineering milestones with their feature milestones to ensure you're utilizing the best tooling and getting the most out of your detection rules. This optional criterion can be skipped if not applicable to internal security teams.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No updates or improvements to telemetry to improve the ruleset.
    * Repeatable: Occasional manual updates and minimal ad hoc collaboration.
    * Defined: Regular updates with significant integration and formalized collaboration, including communication with Points of Contact (POCs) from integration teams and initial integration of CTI data.
    * Managed: Comprehensive updates and collaboration with consistent integration of CTI data, enhancing the contextual relevance of telemetry data and improving detection accuracy.
    * Optimized: Advanced integration of CTI workflows with telemetry data, enabling real-time enrichment and automated responses to emerging threats.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No telemetry updates or improvements.
    * Repeatable: Basic manual updates and improvements occurring sporadically; less than 30% of rule types produce telemetry/internal data.
    * Defined: Regular manual updates and improvements occurring at least once per quarter, with periodic CTI data integration; 50-70% of telemetry data integrated with CTI; initial documentation of enhancements in data quality and rule effectiveness.
    * Managed: Semi-automated updates with continuous improvements, regular CTI data enrichment, and initial documentation of enhancements in data quality and rule effectiveness; 70-90% of telemetry data integrated with CTI.
    * Optimized: Fully automated updates and continuous improvements, comprehensive CTI integration, and detailed documentation of enhancements in data quality and rule effectiveness; 100% of telemetry data integrated with CTI; real-time enrichment and automated responses to emerging threats.

###### Reviewing Threat Landscape Changes

Regularly assess and update rules based on changes in the threat landscape, including threat modeling and organizational changes.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No reviews of threat landscape changes.
    * Repeatable: Occasional reviews with minimal updates and limited threat modeling.
    * Defined: Regular reviews and updates to ensure rule relevance and effectiveness, incorporating threat modeling.
    * Managed: Maintaining the ability to adaptively respond to emerging threats and organizational changes, with comprehensive threat modeling and cross-correlation of new intelligence.
    * Optimized: Continuous monitoring and real-time updates based on emerging threats and organizational changes, with dynamic threat modeling and cross-correlation of intelligence.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No reviews conducted.
    * Repeatable: Reviews conducted bi-annually, referencing cyber blog sites and company reports; less than 30% of rules are reviewed based on threat landscape changes.
    * Defined: Comprehensive quarterly reviews conducted, incorporating new organizational changes, documented changes and improvements in rule effectiveness; 50-70% of rules are reviewed based on threat landscape changes.
    * Managed: Continuous monitoring (monthly, weekly, or daily) of cyber intelligence sources, with actionable knowledge implemented and rules adjusted for new assets and departments; 90-100% of rules are reviewed and updated based on the latest threat intelligence and organizational changes.
    * Optimized: Real-time monitoring and updates with automated intelligence integration; 100% of rules are continuously reviewed and updated based on dynamic threat landscapes and organizational changes.

###### Driving the Feature with Product Owners

Actively engaging with product owners (internal or external) to ensure that the detection needs are on the product roadmap for things related to the detection rule lifecycle or product limitations impacting detection creation. This applies differently for vendors versus in-house security teams. For in-house security teams, this can apply to custom applications developed internally and engaging with vendors or third-party tooling. This implies beginning to build relationships with vendors (such as Elastic) to make feature requests that assist with their detection needs, especially when action needs to be taken by a third party rather than internally.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No engagement with product owners.
    * Repeatable: Ad hoc occasional engagement with some influence on the roadmap.
    * Defined: Regular engagement and significant influence on the product roadmap.
    * Managed: Structured engagement with product owners, leading to consistent integration of detection needs into the product roadmap.
    * Optimized: Continuous, proactive engagement with product owners, ensuring that detection needs are fully integrated into the product development lifecycle with real-time feedback and updates.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No engagements with product owners.
    * Repeatable: 1-2 engagements/requests completed per quarter; less than 20% of requests result in roadmap changes.
    * Defined: More than two engagements/requests per quarter, resulting in roadmap changes and improvements in the detection ruleset; 50-70% of requests result in roadmap changes; regular tracking and documentation of engagement outcomes.
    * Managed: Frequent engagements with product owners leading to more than 70% of requests resulting in roadmap changes; structured tracking and documentation of all engagements and outcomes.
    * Optimized: Continuous engagement with product owners with real-time tracking and adjustments; 90-100% of requests lead to roadmap changes; comprehensive documentation and proactive feedback loops.

###### End-to-End Release Testing and Validation

Implementing a robust end-to-end release testing and validation process to ensure the reliability and effectiveness of detection rules before pushing them to production. This includes running different tests to catch potential issues and ensure rule accuracy.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No formal testing or validation process.
    * Repeatable: Basic testing with minimal validation.
    * Defined: Comprehensive testing with internal validation processes and multiple gates.
    * Managed: Advanced testing with automated and external validation processes.
    * Optimized: Continuous, automated testing and validation with real-time feedback and improvement mechanisms.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No testing or validation activities.
    * Repeatable: 1-2 ruleset updates per release cycle (release cadence should be driven internally based on resources and internally mandated processes); less than 20% of rules tested before deployment.
    * Defined: Time to end-to-end test and release a new rule or tuning from development to production is less than one week; 50-70% of rules are tested before deployment with documented validation.
    * Managed: Ability to deploy an emerging threat rule within 24 hours; 90-100% of rules tested before deployment using automated and external validation processes; continuous improvement based on test outcomes.
    * Optimized: Real-time testing and validation with automated deployment processes; 100% of rules tested and validated continuously; proactive improvement mechanisms based on real-time feedback and intelligence.

#### Tier 2: Intermediate

At the intermediate tier, teams continuously tune detection rules to reduce false positives and stale rules. They identify and document gaps in ruleset coverage, testing and validating rules internally with emulation tools and malware detonations to ensure proper alerting. Systematic gap analysis and regular communication with stakeholders are emphasized.

![DEBMM - Tier 2](/assets/images/elastic-releases-debmm/image3.png "DEBMM - Tier 2")

##### Criteria

###### Continuously Tuning and Reducing False Positives (FP)

Regularly reviewing and adjusting rules to minimize false positives and stale rules. Establish shared/scalable exception lists when necessary to prevent repetitive adjustments and document past FP analysis to avoid recurring issues.

* Qualitative Behaviors - State of Ruleset:
    * Initial: Minimal tuning activities.
    * Repeatable: Reactive tuning based on alerts and ad hoc analyst feedback.
    * Defined: Proactive and systematic tuning, with documented reductions in FP rates and documented/known data sources, leveraged to reduce FPs.
    * Managed: Continuously tuned activities with detailed documentation and regular stakeholder communication; implemented systematic reviews and updates.
    * Optimized: Automated and dynamic tuning processes integrated with advanced analytics and machine learning to continuously reduce FPs and adapt to new patterns.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No reduction in FP rate (when necessary) based on the overall volume of FP alerts reduced.
    * Repeatable: 10-25% reduction in FP rate over the last quarter.
    * Defined: More than a 25% reduction in FP rate over the last quarter, with metrics varying (rate determined by ruleset feature owner) between SIEM and endpoint rules based on the threat landscape.
    * Managed: Consistent reduction in FP rate exceeding 50% over multiple quarters, with detailed metrics tracked and reported.
    * Optimized: Near real-time reduction in FP rate with automated feedback loops and continuous improvement, achieving over 75% reduction in FP rate.

###### Understanding and Documenting Gaps

Identifying gaps in ruleset or product coverage is essential for improving data visibility and detection capabilities. This includes documenting missing fields, logging datasets, and understanding outliers in the data. Communicating these gaps with stakeholders and addressing them as "blockers" helps ensure continuous improvement. By understanding outliers, teams can identify unexpected patterns or anomalies that may indicate undetected threats or issues with the current ruleset.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No gap analysis.
    * Repeatable: Occasional gap analysis with some documentation.
    * Defined: Comprehensive and regular gap analysis with detailed documentation and stakeholder communication, including identifying outliers in the data.
    * Managed: Systematic gap analysis integrated into regular workflows, with comprehensive documentation and proactive communication with stakeholders.
    * Optimized: Automated gap analysis using advanced analytics and machine learning, with real-time documentation and proactive stakeholder engagement to address gaps immediately.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No gaps documented.
    * Repeatable: 1-3 gaps in threat coverage (e.g., specific techniques like reverse shells, code injection, brute force attacks) documented and communicated.
    * Defined: More than three gaps in threat coverage or data visibility documented and communicated, including gaps that block rule creation (e.g., lack of agent/logs) and outliers identified in the data.
    * Managed: Detailed documentation and communication of all identified gaps, with regular updates and action plans to address them; over five gaps documented and communicated regularly.
    * Optimized: Continuous real-time gap analysis with automated documentation and communication; proactive measures in place to address gaps immediately; comprehensive tracking and reporting of all identified gaps.

###### Testing and Validation (Internal)

Performing activities like executing emulation tools, C2 frameworks, detonating malware, or other repeatable techniques to test rule functionality and ensure proper alerting.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No testing or validation.
    * Repeatable: Occasional testing with emulation capabilities.
    * Defined: Regular and comprehensive testing with malware or emulation capabilities, ensuring all rules in production are validated.
    * Managed: Systematic testing and validation processes integrated into regular workflows, with detailed documentation and continuous improvement.
    * Optimized: Automated and continuous testing and validation with advanced analytics and machine learning, ensuring real-time validation and improvement of all rules.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No internal tests were conducted.
    * Repeatable: 40% emulation coverage of production ruleset.
    * Defined: 80% automated testing coverage of production ruleset.
    * Managed: Over 90% automated testing coverage of production ruleset with continuous validation processes.
    * Optimized: 100% automated and continuous testing coverage with real-time validation and feedback loops, ensuring optimal rule performance and accuracy.

#### Tier 3: Advanced

Advanced maturity involves systematically identifying and addressing false negatives, validating detection rules externally, and covering advanced TTPs (Tactics, Techniques, and Procedures). This tier emphasizes comprehensive and continuous improvement through external assessments and coverage of sophisticated threats.

![DEBMM - Tier 3](/assets/images/elastic-releases-debmm/image9.png "DEBMM - Tier 3")

##### Criteria

###### Triaging False Negatives (FN)

Triaging False Negatives (FN) involves systematically identifying and addressing instances where the detection rules fail to trigger alerts for actual threats, referred to as false negatives. False negatives occur when a threat is present in the dataset but is not detected by the existing rules, potentially leaving the organization vulnerable to undetected attacks. Leveraging threat landscape insights, this process documents and assesses false negatives within respective environments, aiming for a threshold of true positives in the dataset using the quantitative criteria.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No triage of false negatives.
    * Repeatable: Sporadic triage with some improvements.
    * Defined: Systematic and regular triage with documented reductions in FNs and comprehensive FN assessments in different threat landscapes.
    * Managed: Proactive triage activities with detailed documentation and stakeholder communication; regular updates to address FNs.
    * Optimized: Continuous, automated triage and reduction of FNs using advanced analytics and machine learning; real-time documentation and updates.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No reduction in FN rate.
    * Repeatable: 50% of the tested samples or tools used to trigger an alert; less than 10% of rules are reviewed for FNs quarterly; minimal documentation of FN assessments.
    * Defined: 70-90% of the tested samples trigger an alert, with metrics varying based on the threat landscape and detection capabilities; 30-50% reduction in FNs over the past year; comprehensive documentation and review of FNs for at least 50% of the rules quarterly; regular feedback loops established with threat intelligence teams.
    * Managed: 90-100% of tested samples trigger an alert, with consistent FN reduction metrics tracked; over 50% reduction in FNs over multiple quarters; comprehensive documentation and feedback loops for all rules.
    * Optimized: Near real-time FN triage with automated feedback and updates; over 75% reduction in FNs; continuous documentation and proactive measures to address FNs.

###### External Validation

External Validation involves engaging third parties to validate detection rules through various methods, including red team exercises, third-party assessments, penetration testing, and collaboration with external threat intelligence providers. By incorporating diverse perspectives and expertise, this process ensures that the detection rules are robust, comprehensive, and effective against real-world threats.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No external validation.
    * Repeatable: Occasional external validation efforts with some improvements.
    * Defined: Regular and comprehensive external validation with documented feedback, improvements, and integration of findings into the detection ruleset. This level includes all of these validation methods.
    * Managed: Structured external validation activities with detailed documentation and continuous improvement; proactive engagement with multiple third-party validators.
    * Optimized: Continuous external validation with automated feedback integration, real-time updates, and proactive improvements based on diverse third-party insights.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No external validation was conducted.
    * Repeatable: 1 external validation exercise per year, such as a red team exercise or third-party assessment; less than 20% of identified gaps are addressed annually.
    * Defined: More than one external validation exercise per year, including a mix of methods such as red team exercises, third-party assessments, penetration testing, and collaboration with external threat intelligence providers; detailed documentation of improvements based on external feedback, with at least 80% of identified gaps addressed within a quarter; integration of external validation findings into at least 50% of new rules.
    * Managed: Multiple external validation exercises per year, with comprehensive feedback integration; over 90% of identified gaps addressed within set timelines; proactive updates to rules based on continuous external insights.
    * Optimized: Continuous, real-time external validation with automated feedback and updates; 100% of identified gaps addressed proactively; comprehensive tracking and reporting of all external validation outcomes.

###### Advanced TTP Coverage

Covering non-commodity malware (APTs, zero-days, etc.) and emerging threats (new malware families and offensive security tools abused by threat actors, etc.) in the ruleset. This coverage is influenced by the capability of detecting these advanced threats, which requires comprehensive telemetry and flexible data ingestion. While demonstrating these behaviors early in the maturity process can have a compounding positive effect on team growth, this criterion is designed to focus on higher fidelity rulesets with low FPs.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No advanced TTP coverage.
    * Repeatable: Response to some advanced TTPs based on third-party published research.
    * Defined: First-party coverage created for advanced TTPs based on threat intelligence and internal research, with flexible and comprehensive data ingestion capabilities.
    * Managed: Proactive coverage for advanced TTPs with detailed threat intelligence and continuous updates; integration with diverse data sources for comprehensive detection.
    * Optimized: Continuous, automated coverage for advanced TTPs using advanced analytics and machine learning; real-time updates and proactive measures for emerging threats.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No advanced TTP coverage.
    * Repeatable: Detection and response to 1-3 advanced TTPs/adversaries based on available data and third-party research; less than 20% of rules cover advanced TTPs.
    * Defined: Detection and response to more than three advanced TTPs/adversaries uniquely identified and targeted based on first-party threat intelligence and internal research; 50-70% of rules cover advanced TTPs; comprehensive telemetry and flexible data ingestion for at least 70% of advanced threat detections; regular updates to advanced TTP coverage based on new threat intelligence.
    * Managed: Detection and response to over five advanced TTPs/adversaries with continuous updates and proactive measures; 70-90% of rules cover advanced TTPs with integrated telemetry and data ingestion; regular updates and feedback loops with threat intelligence teams.
    * Optimized: Real-time detection and response to advanced TTPs with automated updates and proactive coverage; 100% of rules cover advanced TTPs with continuous telemetry integration; dynamic updates and real-time feedback based on evolving threat landscapes.

#### Tier 4: Expert

The expert tier focuses on advanced automation, seamless integration with other security tools, and continuous improvement through regular updates and external collaboration. While proactive threat hunting is essential for maintaining a solid security posture, it complements the ruleset management process by identifying new patterns and insights that can be incorporated into detection rules. Teams implement sophisticated automation for rule updates, ensuring continuous integration of advanced detections. At Elastic, our team is constantly refining our rulesets through daily triage, regular updates, and sharing [threat hunt queries](https://github.com/elastic/detection-rules/tree/main/hunting) in our public GitHub repository to help the community improve their detection capabilities. 

![DEBMM - Tier 4](/assets/images/elastic-releases-debmm/image7.png "DEBMM - Tier 4")

##### Criteria

###### Hunting in Telemetry/Internal Data

Setting up queries and daily triage to hunt for new threats and ensure rule effectiveness. This applies to vendors hunting in telemetry and other teams hunting in their available datasets.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No hunting activities leading to ruleset improvement.
    * Repeatable: Occasional hunting activities with some findings.
    * Defined: Regular and systematic hunting with significant coverage findings based on the Threat Hunting Maturity Model, including findings from external validation, end-to-end testing, and malware detonations.
    * Managed: Continuous hunting activities with comprehensive documentation and integration of findings; regular feedback loops between hunting and detection engineering teams.
    * Optimized: Automated, real-time hunting with advanced analytics and machine learning; continuous documentation and proactive integration of findings to enhance detection rules.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No hunting activities conducted, leading to ruleset improvement.
    * Repeatable: Bi-weekly outcome (e.g., discovered threats, new detections based on hypotheses, etc.) from hunting workflows; less than 20% of hunting findings are documented; minimal integration of hunting results into detection rules.
    * Defined: Weekly outcome with documented improvements and integration into detection rules based on hunting results and external validation data; 50-70% of hunting findings are documented and integrated into detection rules; regular feedback loop established between hunting and detection engineering teams.
    * Managed: Daily hunting activities with comprehensive documentation and integration of findings; over 90% of hunting findings are documented and lead to updates in detection rules; continuous improvement processes based on hunting results and external validation data; regular collaboration with threat intelligence teams to enhance hunting effectiveness.
    * Optimized: Real-time hunting activities with automated documentation and integration; 100% of hunting findings are documented and lead to immediate updates in detection rules; continuous improvement with proactive measures based on advanced analytics and threat intelligence.

###### Continuous Improvement and Potential Enhancements

Continuous improvement is vital at the expert tier, leveraging the latest technologies and methodologies to enhance detection capabilities. The "Optimized" levels in the different criteria across various tiers emphasize the necessity for advanced automation and the integration of emerging technologies. Implementing automation for rule updates, telemetry filtering, and integration with other advanced tools is essential for modern detection engineering. While current practices involve advanced automation beyond basic case management and SOAR (Security Orchestration, Automation, and Response), there is potential for further enhancements using emerging technologies like generative AI and large language models (LLMs). This reinforces the need for continuous adaptation and innovation at the highest tier to maintain a robust and effective security posture.

* Qualitative Behaviors - State of Ruleset:
    * Initial: No automation.
    * Repeatable: Basic automation for rule management processes, such as ETL (Extract, transform, and load) data plumbing to enable actionable insights.
    * Defined: Initial use of generative AI to assist in rule creation and assessment. For example, AI can assess the quality of rules based on predefined criteria.
    * Managed: Advanced use of AI/LLMs to detect rule duplications and overlaps, suggesting enhancements rather than creating redundant rules.
    * Optimized: Full generative AI/LLMs integration throughout the detection engineering lifecycle. This includes using AI to continuously improve rule accuracy, reduce false positives, and provide insights on rule effectiveness.
* Quantitative Measurements - Activities to Maintain State:
    * Initial: No automated processes implemented.
    * Repeatable: Implement basic automated processes for rule management and integration; less than 30% of rule management tasks are automated; initial setup of automated deployment and version control.
    * Defined: Use of AI to assess rule quality, with at least 80% of new rules undergoing automated quality checks before deployment; 40-60% of rule management tasks are automated; initial AI-driven insights are used to enhance rule effectiveness and reduce false positives.
    * Managed: AI-driven duplication detection, with a target of reducing rule duplication by 50% within the first year of implementation; 70-80% of rule management tasks are automated; AI-driven suggestions result in a 30-50% reduction in FPs; continuous integration pipeline capturing and deploying rule updates.
    * Optimized: Comprehensive AI integration, where over 90% of rule updates and optimizations are suggested by AI, leading to a significant decrease in manual triaging of alerts and a 40% reduction in FPs; fully automated rule management and deployment processes; real-time AI-driven telemetry filtering and integration with other advanced tools.

### Applying the DEBMM to Understand Maturity

Once you understand the DEBMM and its tiers, you can begin applying it to assess and enhance your detection engineering maturity.

![Maturity Progression](/assets/images/elastic-releases-debmm/image4.png "Maturity Progression")

The following steps will guide you through the process:

**1. Audit Your Current Maturity Tier**: Evaluate your existing detection rulesets against the criteria outlined in the DEBMM. Identify your rulesets' strengths, weaknesses, and most significant risks to help determine your current maturity tier. For more details, see the [Example Questionnaire](#Example-Questionnaire).

**2. Understand the Scope of Effort: **Recognize the significant and sustained effort required to move from one tier to the next. As teams progress through the tiers, the complexity and depth of activities increase, requiring more resources, advanced skills, and comprehensive strategies. For example, transitioning from Tier 1 to Tier 2 involves systematic rule tuning and detailed gap analysis, while advancing to Tier 3 and Tier 4 requires robust external validation processes, proactive threat hunting, and sophisticated automation.

**3. Set Goals for Progression: **Define specific goals for advancing to the next tier. Use the qualitative and quantitative measures to set clear objectives for each criterion. 

**4. Develop a Roadmap:** Create a detailed plan outlining the actions needed to achieve the goals. Include timelines, resources, and responsible team members. Ensure foundational practices from lower tiers are consistently applied as you progress while identifying opportunities for quick wins or significant impact by first addressing the most critical and riskiest areas for improvement.

![](/assets/images/elastic-releases-debmm/image7.png)

**5. Implement Changes:** Execute the plan, ensuring all team members are aligned with the objectives and understand their roles. Review and adjust the plan regularly as needed.

**6. Monitor and Measure Progress:** Continuously track and measure the performance of your detection rulesets against the DEBMM criteria. Use metrics and key performance indicators (KPIs) to monitor your progress and identify areas for further improvement.

**7. Iterate and Improve:** Regularly review and update your improvement plan based on feedback, results, and changing threat landscapes. Iterate on your detection rulesets to enhance their effectiveness and maintain a high maturity tier.

#### Grouping Criteria for Targeted Improvement

To further simplify the process, you can group criteria into specific categories to focus on targeted improvements. For example:

* **Rule Creation and Management:** Includes criteria for creating, managing, and maintaining rules.
* **Telemetry and Data Quality:** Focuses on improving and maintaining telemetry quality.
* **Threat Landscape Review:** Involves regularly reviewing and updating rules based on changes in the threat landscape.
* **Stakeholder Engagement:** Engaging with product owners and other stakeholders to meet detection needs.

Grouping criteria allow you to prioritize activities and improvements based on your current needs and goals. This structured and focused approach helps enhance your detection rulesets and is especially beneficial for teams with multiple feature owners working in different domains toward a common goal.

## Conclusion

Whether you apply the DEBMM to your ruleset or use it as a guide to enhance your detection capabilities, the goal is to help you systematically develop, manage, and improve your detection rulesets. By following this structured model and progressing through the maturity tiers, you can significantly enhance the effectiveness of your threat detection capabilities. Remember, security is a continuous journey; consistent improvement is essential to stay ahead of emerging threats and maintain a robust security posture. The DEBMM will support you in achieving better security and more effective threat detection. We value your feedback and suggestions on refining and enhancing the model to benefit the security community. Please feel free to reach out with your thoughts and ideas.

We’re always interested in hearing use cases and workflows like these, so as always, reach out to us via [GitHub issues](https://github.com/elastic/protections-artifacts/issues), chat with us in our [community Slack](http://ela.st/slack), and ask questions in our [Discuss forums](https://discuss.elastic.co/c/security/endpoint-security/80)!

## Appendix

### Example Rule Metadata 

Below is an updated list of criteria that align with example metadata used within Elastic but should be tailored to the product used:

|        Field        |                                                                                                                                                                              Criteria                                                                                                                                                                              |
|:-------------------:|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| name                | Should be descriptive, concise, and free of typos related to the rule. Clearly state the action or behavior being detected. Validation can include spell-checking and ensuring it adheres to naming conventions.                                                                                                                                                   |
| author              | Should attribute the author or organization who developed the rule.                                                                                                                                                                                                                                                                                                |
| description         | Detailed explanation of what the rule detects, including the context and significance. Should be free of jargon and easily understandable. Validation can ensure the length and readability of the text.                                                                                                                                                           |
| from                | Defines the time range the rule should look back from the current time. Should be appropriate for the type of detection and the expected data retention period. Validation can check if the time range is within acceptable limits.                                                                                                                                |
| index               | Specifies the data indices to be queried. Should accurately reflect where relevant data is stored. Validation can ensure indices exist and are correctly formatted.                                                                                                                                                                                                |
| language            | Indicates the query language used (e.g., EQL, KQL, Lucene). Should be appropriate for the type of query and the data source if multiple languages are available. Validation can confirm the language is supported and matches the query format.                                                                                                                    |
| license             | Indicates the license under which the rule is provided. Should be clear and comply with legal requirements. Validation can check against a list of approved licenses.                                                                                                                                                                                              |
| rule_id             | Unique identifier for the rule. Should be a UUID to ensure uniqueness. Validation can ensure the rule_id follows UUID format.                                                                                                                                                                                                                                      |
| risk_score          | Numerical value representing the severity or impact of the detected behavior. Should be based on a standardized scoring system. Validation can check the score against a defined range.                                                                                                                                                                            |
| severity            | Descriptive level of the rule's severity (e.g., low, medium, high). Should align with the risk score and organizational severity definitions. Validation can ensure consistency between risk score and severity.                                                                                                                                                   |
| tags                | List of tags categorizing the rule. Should include relevant domains, operating systems, use cases, tactics, and data sources. Validation can check for the presence of required tags and their format.                                                                                                                                                             |
| type                | Specifies the type of rule (e.g., eql, query). Should match the query language and detection method. Validation can ensure the type is correctly specified.                                                                                                                                                                                                        |
| query               | The query logic used to detect the behavior. Should be efficient, accurate, and tested for performance with fields validated against a schema. Validation can include syntax checking and performance testing.                                                                                                                                                     |
| references          | List of URLs or documents that provide additional context or background information. Should be relevant and authoritative. Validation can ensure URLs are accessible and from trusted sources.                                                                                                                                                                     |
| setup               | Instructions for setting up the rule. Should be clear, comprehensive, and easy to follow. Validation can check for completeness and clarity.                                                                                                                                                                                                                       |
| creation_date       | Date when the rule was created. Should be in a standardized format. Validation can ensure the date is in the correct format.                                                                                                                                                                                                                                       |
| updated_date        | Date when the rule was last updated. Should be in a standardized format. Validation can ensure the date is in the correct format.                                                                                                                                                                                                                                  |
| integration         | List of integrations that the rule supports. Should be accurate and reflect all relevant integrations. Validation can ensure integrations are correctly listed.                                                                                                                                                                                                    |
| maturity            | Indicates the maturity level of the rule (e.g., experimental, beta, production). Should reflect the stability and reliability of the rule. Validation can check against a list of accepted maturity levels. Note: While this field is not explicitly used in Kibana, it’s beneficial to track rules with different maturities in the format stored locally in VCS. |
| threat              | List of MITRE ATT&CK tactics, techniques, and subtechniques related to the rule. Should be accurate and provide relevant context. Validation can check for correct mapping to MITRE ATT&CK.                                                                                                                                                                        |
| actions             | List of actions to be taken when the rule is triggered. Should be clear and actionable. Validation can ensure actions are feasible and clearly defined.                                                                                                                                                                                                            |
| building_block_type | Type of building block rule if applicable. Should be specified if the rule is meant to be a component of other rules. Validation can ensure this field is used appropriately.                                                                                                                                                                                      |
| enabled             | Whether the rule is currently enabled or disabled. Validation can ensure this field is correctly set.                                                                                                                                                                                                                                                              |
| exceptions_list     | List of exceptions to the rule. Should be comprehensive and relevant. Validation can check for completeness and relevance.                                                                                                                                                                                                                                         |
| version             | Indicates the version of the rule (int, semantic version, etc) to track changes. Validation can ensure the version follows a consistent format.                                                                                                                                                                                                                    |

### Example Questionnaire

#### 1. Identify Threat Landscape

**Questions to Ask:**

* Do you regularly review the top 5 threats your organization faces? (Yes/No)
* Are relevant tactics and techniques identified for these threats? (Yes/No)
* Is the threat landscape reviewed and updated regularly? (Yes - Monthly/Yes - Quarterly/Yes - Annually/No)
* Have any emerging threats been recently identified? (Yes/No)
* Is there a designated person responsible for monitoring the threat landscape? (Yes/No)
* Do you have data sources that capture relevant threat traffic? (Yes/Partial/No)
* Are critical assets likely to be affected by these threats identified? (Yes/No)
* Are important assets and their locations documented? (Yes/No)
* Are endpoints, APIs, IAM, network traffic, etc. in these locations identified? (Yes/Partial/No)
* Are critical business operations identified and their maintenance ensured? (Yes/No)
* If in healthcare, are records stored in a HIPAA-compliant manner? (Yes/No)
* If using cloud, is access to cloud storage locked down across multiple regions? (Yes/No)

**Steps for Improvement:**

* Establish a regular review cycle for threat landscape updates.
* Engage with external threat intelligence providers for broader insights.

#### 2. Define the Perfect Rule

**Questions to Ask:**

* Are required fields for a complete rule defined? (Yes/No)
* Is there a process for documenting and validating rules? (Yes/No)
* Is there a clear process for creating new rules? (Yes/No)
* Are rules prioritized for creation and updates based on defined criteria? (Yes/No)
* Are templates or guidelines available for rule creation? (Yes/No)
* Are rules validated for a period before going into production? (Yes/No)

**Steps for Improvement:**

* Develop and standardize templates for rule creation.
* Implement a review process for rule validation before deployment.

#### 3. Define the Perfect Ruleset

**Questions to Ask:**

* Do you have baseline rules needed to cover key threats? (Yes/No)
* Are major threat techniques covered by your ruleset? (Yes/Partial/No)
* Is the effectiveness of the ruleset measured? (Yes - Comprehensively/Yes - Partially/No)
* Do you have specific criteria used to determine if a rule should be included in the ruleset? (Yes/No)
* Is the ruleset maintained and updated? (Yes - Programmatic Maintenance & Frequent Updates/Yes - Programmatic Maintenance & Ad hoc Updates/Yes - Manual Maintenance & Frequent Updates/Yes - Manual Maintenance & Ad Hoc Updates/No)

**Steps for Improvement:**

* Perform gap analysis to identify missing coverage areas.
* Regularly update the ruleset based on new threat intelligence and feedback.

#### 4. Maintain

**Questions to Ask:**

* Are rules reviewed and updated regularly? (Yes - Monthly/Yes - Quarterly/Yes - Annually/No)
* Is there a version control system in place? (Yes/No)
* Are there documented processes for rule maintenance? (Yes/No)
* How are changes to the ruleset communicated to stakeholders? (Regular Meetings/Emails/Documentation/No Communication)
* Are there automated processes for rule updates and validation? (Yes/Partial/No)

**Steps for Improvement:**

* Implement version control for all rules.
* Establish automated workflows for rule updates and validation.

#### 5. Test & Release

**Questions to Ask:**

* Are tests performed before rule deployment? (Yes/No)
* Is there a documented validation process? (Yes/No)
* Are test results documented and used to improve rules? (Yes/No)
* Is there a designated person responsible for testing and releasing rules? (Yes/No)
* Are there automated testing frameworks in place? (Yes/Partial/No)

**Steps for Improvement:**

* Develop and maintain a testing framework for rule validation.
* Document and review test results to continuously improve rule quality.

#### 6. Criteria Assessment

**Questions to Ask:**

* Are automated tools, including generative AI, used in the rule assessment process? (Yes/No)
* How often are automated assessments conducted using defined criteria? (Monthly/Quarterly/Annually/Never)
* What types of automation or AI tools are integrated into the rule assessment process? (List specific tools)
* How are automated insights, including those from generative AI, used to optimize rules? (Regular Updates/Ad hoc Updates/Not Used)
* What metrics are tracked to measure the effectiveness of automated assessments? (List specific metrics)

**Steps for Improvement:**

* Integrate automated tools, including generative AI, into the rule assessment and optimization process.
* Regularly review and implement insights from automated assessments to enhance rule quality.

#### 7. Iterate

**Questions to Ask:**

* How frequently is the assessment process revisited? (Monthly/Quarterly/Annually/Never)
* What improvements have been identified and implemented from previous assessments? (List specific improvements)
* How is feedback from assessments incorporated into the ruleset? (Regular Updates/Ad hoc Updates/Not Used)
* Who is responsible for iterating on the ruleset based on assessment feedback? (Designated Role/No Specific Role)
* Are there metrics to track progress and improvements over time? (Yes/No)

**Steps for Improvement:**

* Establish a regular review and iteration cycle.
* Track and document improvements and their impact on rule effectiveness.

_The release and timing of any features or functionality described in this post remain at Elastic's sole discretion. Any features or functionality not currently available may not be delivered on time or at all._