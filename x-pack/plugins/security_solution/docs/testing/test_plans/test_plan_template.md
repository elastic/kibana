# Awesome Feature

<!-- Elaborate on what are you testing here, explain what the Awesome Feature is about. -->
This is a test plan for ...

<!-- Add any additional info, e.g. are you expecting to finalize it in your PR, or later. -->
Status: `in progress`. <!-- `in progress` | `done` -->

## Useful information

### Tickets

<!-- Add links to any related tickets. -->

- [Awesome Feature](https://github.com/elastic/security-team/issues/9999) epic
- [Add tests for the new awesome feature](https://github.com/elastic/kibana/issues/999999)
- [Document the new awesome feature](https://github.com/elastic/security-docs/issues/9999)

### Terminology

<!--
  Explain special terminology around the feature.
  This would allow you to write more concise scenarios, which would improve readability.
-->

- **Term 1**: explanation.

- **Term 2**: explanation.

### Assumptions

<!-- 
  Mention any assumptions for the scenarios that are not explicitly stated in their steps.
  For example, you could describe:
  - license requirements: the feature is available under the Basic license
  - RBAC requirements: user should have certain privileges to normally access the feature
  - data setup: user should have certain saved objects, source events, alerts, etc in the system
-->

- Assumption 1.
- Assumption 2.

### Non-functional requirements

<!--
  Describe any non-function requirements for the feature, if you have any. These could be about:
  - existence or lack of any data in Elasticsearch
  - scale: size of data (number or size of objects), number of Elasticsearch or Kibana nodes, etc
  - performance
  - resilience and error handling
  - observability: APM instrumentation, console logging, event log, correlation ids
  - testing
-->

- Requirement 1.
- Requirement 2.

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
