# Coverage Overview Dashboard

This is a test plan for the Mitre Att&ck coverage overview dashboard

Status: `in progress`. The current test plan matches `Milestone 1 - MVP` of the [Protections/Detections Coverage Overview Page](https://github.com/elastic/security-team/issues/2905) epic. The plan will be built upon further as more feature are added in later milestones.

## Useful information

### Tickets

<!-- Add links to any related tickets. -->

- [Protections/Detections Coverage Overview Page](https://github.com/elastic/security-team/issues/2905) epic
- [Add test coverage for Protections/Detections Coverage Overview](https://github.com/elastic/kibana/issues/162250)
- [Write a test plan for Protections/Detections Coverage Overview](https://github.com/elastic/kibana/issues/162248)

### Terminology

- **Mitre Att&ck**: The [3rd party framework](https://attack.mitre.org/) the dashboard is built upon. It is a knowledge base of attack tactics and techniques adversaries use in real world applications.

- **Tactic**: A generalized category or process that advesaries use to attack a system. Envelops many relevant Mitre Att&ck techniques

- **Technique**: A specific technique advesaries use to attack a system. Can belong to one or more different Mitre Tactics and can potentially contain one or more sub-techniques further describing the process.

### Assumptions

- Currently all scenarios below only apply to rules that have correctly mapped `threat` fields (unmapped fields or `threat` fields that don't contain current versioned Mitre Att&ck data will not be displayed in the dashboard)
- The feature is available under the Basic license

### Non-functional requirements

- Number of rules needs to be under 10k due to [this current bug](https://github.com/elastic/kibana/issues/160698)

## Scenarios

<!--
  Add scenarios for the feature. Split them into meaningful sections (groups) of related scenarios.
  The goal of having sections is to make it easier to navigate the test plan:
  - there shouldn't be too many sections with few scenarios in each -- it would be hard to see
    the whole picture of how the feature works
  - there shouldn't bee too few sections with a lot of scenarios in each

  For example, here's some typical sections you might want to add:
  - "Core functionality". Happy paths, base use cases, etc. Split it into several sections if
    there's too many scenarios for it.
  - "Error handling"
  - "Authorization / RBAC"
  - "Kibana upgrade"
-->

### Section 1

#### **Scenario: Awesome feature works**

<!-- Describe how are you planning to automate this scenario -->

**Automation**: X e2e tests + Y integration tests + unit tests.

<!-- Use Gherkin syntax to describe the scenario https://cucumber.io/docs/gherkin/ -->

```Gherkin
Given ...
When ...
Then ...
```

<!-- Consider adding any other useful notes and clarifications -->

### Section 2

#### **Scenario: ?**

**Automation**: X e2e tests + Y integration tests + unit tests.

```Gherkin
Given ...
When ...
Then ...
```
