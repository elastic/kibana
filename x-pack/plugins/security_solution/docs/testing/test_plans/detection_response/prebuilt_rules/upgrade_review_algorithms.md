# Diff Algorithms for `upgrade/_review` Endpoint

This is a test plan for the `upgrade/_review` endpoint diff algorithms that are a part of the larger prebuilt rules customization feature. These algorithms determine what fields get returned when a user makes an API request to review changes as a part of the rule update process and determine what version of those fields should be displayed by the UI.

Status: `in progress`.

## Table of Contents

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
  - [Assumptions](#assumptions)
  - [Non-functional requirements](#non-functional-requirements)
  - [Functional requirements](#functional-requirements)
- [Scenarios](#scenarios)

  - [Rule field doesn't have an update and has no custom value - `AAA`](#rule-field-doesnt-have-an-update-and-has-no-custom-value---aaa)
    - [**Scenario: `AAA` - Rule field is any type**](#scenario-aaa---rule-field-is-any-type)
  - [Rule field doesn't have an update but has a custom value - `ABA`](#rule-field-doesnt-have-an-update-but-has-a-custom-value---aba)
    - [**Scenario: `ABA` - Rule field is any type**](#scenario-aba---rule-field-is-any-type)
  - [Rule field has an update and doesn't have a custom value - `AAB`](#rule-field-has-an-update-and-doesnt-have-a-custom-value---aab)
    - [**Scenario: `AAB` - Rule field is any type**](#scenario-aab---rule-field-is-any-type)
  - [Rule field has an update and a custom value that are the same - `ABB`](#rule-field-has-an-update-and-a-custom-value-that-are-the-same---abb)
    - [**Scenario: `ABB` - Rule field is any type**](#scenario-abb---rule-field-is-any-type)
  - [Rule field has an update and a custom value that are NOT the same - `ABC`](#rule-field-has-an-update-and-a-custom-value-that-are-not-the-same---abc)
    - [**Scenario: `ABC` - Rule field is a number or single line string**](#scenario-abc---rule-field-is-a-number-or-single-line-string)
    - [**Scenario: `ABC` - Rule field is an array of scalar values**](#scenario-abc---rule-field-is-an-array-of-scalar-values)
  - [Rule field has an update and a custom value that are the same and the rule base version doesn't exist - `-AA`](#rule-field-has-an-update-and-a-custom-value-that-are-the-same-and-the-rule-base-version-doesnt-exist----aa)
    - [**Scenario: `-AA` - Rule field is any type**](#scenario--aa---rule-field-is-any-type)
  - [Rule field has an update and a custom value that are NOT the same and the rule base version doesn't exist - `-BC`](#rule-field-has-an-update-and-a-custom-value-that-are-not-the-same-and-the-rule-base-version-doesnt-exist----bc)
    - [**Scenario: `-BC` - Rule field is a number or single line string**](#scenario--bc---rule-field-is-a-number-or-single-line-string)
    - [**Scenario: `-BC` - Rule field is an array of scalar values**](#scenario--bc---rule-field-is-an-array-of-scalar-values)

## Useful information

### Tickets

- [Users can customize prebuilt detection rules](https://github.com/elastic/kibana/issues/174168) epic
- [Implement single-line string diff algorithm](https://github.com/elastic/kibana/issues/180158)
- [Implement number diff algorithm](https://github.com/elastic/kibana/issues/180160)
- [Implement array of scalar values diff algorithm](https://github.com/elastic/kibana/issues/180162)

### Terminology

- **Base version**: Also labeled as `base_version`. This is the version of a rule authored by Elastic as it is installed from the `security_detection_engine` package, with no customizations to any fields by the user.

- **Current version**: Also labeled as `current_version`. This is the version of the rule that the user currently has installed. Consists of the `base_version` of the rules plus all customization applies to its fields by the user.

- **Target version**: Also labeled as `target_version`. This is the version of the rule that contains the update from Elastic.

- **Merged version**: Also labeled as `merged_version`. This is the version of the rule that we determine via the various algorithms. It could contain a mix of all the rule versions on a per-field basis to create a singluar version of the rule containing all relevant updates and user changes to display to the user.

### Assumptions

- All scenarios will contain at least 1 prebuilt rule installed in Kibana.
- A new version will be available for rule(s).

## Scenarios

### Rule field doesn't have an update and has no custom value - `AAA`

#### **Scenario: `AAA` - Rule field is any type**

**Automation**: 3 integration tests with mock rules + a set of unit tests for each algorithm

```Gherkin
Given <field_name> field is not customized by the user (current version == base version)
And <field_name> field is not updated by Elastic in this upgrade (target version == base version)
Then for <field_name> field the diff algorithm should output the current version as the merged one without a conflict
And <field_name> field should not be returned from the `upgrade/_review` API endpoint
And <field_name> field should not be shown in the upgrade preview UI

Examples:
| algorithm          | field_name | base_version            | current_version         | target_version          | merged_version          |
| single line string | name       | "A"                     | "A"                     | "A"                     | "A"                     |
| number             | risk_score | 1                       | 1                       | 1                       | 1                       |
| array of scalars   | tags       | ["one", "two", "three"] | ["one", "three", "two"] | ["three", "one", "two"] | ["one", "three", "two"] |
```

### Rule field doesn't have an update but has a custom value - `ABA`

#### **Scenario: `ABA` - Rule field is any type**

**Automation**: 3 integration tests with mock rules + a set of unit tests for each algorithm

```Gherkin
Given <field_name> field is customized by the user (current version != base version)
And <field_name> field is not updated by Elastic in this upgrade (target version == base version)
Then for <field_name> field the diff algorithm should output the current version as the merged one without a conflict
And <field_name> field should be returned from the `upgrade/_review` API endpoint
And <field_name> field should be shown in the upgrade preview UI

Examples:
| algorithm          | field_name | base_version            | current_version         | target_version          | merged_version          |
| single line string | name       | "A"                     | "B"                     | "A"                     | "B"                     |
| number             | risk_score | 1                       | 2                       | 1                       | 2                       |
| array of scalars   | tags       | ["one", "two", "three"] | ["one", "two", "four"]  | ["one", "two", "three"] | ["one", "two", "four"]  |
```

### Rule field has an update and doesn't have a custom value - `AAB`

#### **Scenario: `AAB` - Rule field is any type**

**Automation**: 3 integration tests with mock rules + a set of unit tests for each algorithm

```Gherkin
Given <field_name> field is not customized by the user (current version == base version)
And <field_name> field is updated by Elastic in this upgrade (target version != base version)
Then for <field_name> field the diff algorithm should output the target version as the merged one without a conflict
And <field_name> field should be returned from the `upgrade/_review` API endpoint
And <field_name> field should be shown in the upgrade preview UI

Examples:
| algorithm          | field_name | base_version            | current_version         | target_version          | merged_version          |
| single line string | name       | "A"                     | "A"                     | "B"                     | "B"                     |
| number             | risk_score | 1                       | 1                       | 2                       | 2                       |
| array of scalars   | tags       | ["one", "two", "three"] | ["one", "two", "three"] | ["one", "two", "four"]  | ["one", "two", "four"]  |
```

### Rule field has an update and a custom value that are the same - `ABB`

#### **Scenario: `ABB` - Rule field is any type**

**Automation**: 3 integration tests with mock rules + a set of unit tests for each algorithm

```Gherkin
Given <field_name> field is customized by the user (current version != base version)
And <field_name> field is updated by Elastic in this upgrade (target version != base version)
And customized <field_name> field is the same as the Elastic update in this upgrade (current version == target version)
Then for <field_name> field the diff algorithm should output the current version as the merged one without a conflict
And <field_name> field should be returned from the `upgrade/_review` API endpoint
And <field_name> field should be shown in the upgrade preview UI

Examples:
| algorithm          | field_name | base_version            | current_version         | target_version          | merged_version          |
| single line string | name       | "A"                     | "B"                     | "B"                     | "B"                     |
| number             | risk_score | 1                       | 2                       | 2                       | 2                       |
| array of scalars   | tags       | ["one", "two", "three"] | ["one", "two", "four"]  | ["one", "two", "four"]  | ["one", "two", "four"]  |
```

### Rule field has an update and a custom value that are NOT the same - `ABC`

#### **Scenario: `ABC` - Rule field is a number or single line string**

**Automation**: 2 integration tests with mock rules + a set of unit tests for the algorithms

```Gherkin
Given <field_name> field is customized by the user (current version != base version)
And <field_name> field is updated by Elastic in this upgrade (target version != base version)
And customized <field_name> field is different than the Elastic update in this upgrade (current version != target version)
Then for <field_name> field the diff algorithm should output the current version as the merged one with a non-solvable conflict
And <field_name> field should be returned from the `upgrade/_review` API endpoint
And <field_name> field should be shown in the upgrade preview UI

Examples:
| algorithm          | field_name | base_version | current_version | target_version  | merged_version |
| single line string | name       | "A"          | "B"             | "C"             | "B"            |
| number             | risk_score | 1            | 2               | 3               | 2              |
```

#### **Scenario: `ABC` - Rule field is an array of scalar values**

**Automation**: 5 integration tests with mock rules + a set of unit tests for the algorithm

```Gherkin
Given <field_name> field is customized by the user (current version != base version)
And <field_name> field is updated by Elastic in this upgrade (target version != base version)
And customized <field_name> field is different than the Elastic update in this upgrade (current version != target version)
Then for <field_name> field the diff algorithm should output a custom merged version with a solvable conflict
And arrays should be deduplicated before comparison
And arrays should be compared sensitive of case
And arrays should be compared agnostic of order
And <field_name> field should be returned from the `upgrade/_review` API endpoint
And <field_name> field should be shown in the upgrade preview UI

Examples:
| algorithm        | field_name | base_version                          | current_version         | target_version                   | merged_version                   |
| array of scalars | tags       | ["one", "two", "three"]               | ["one", "two", "four"]  | ["one", "two", "five"]           | ["one", "two", "four", "five"]   |
| array of scalars | tags       | ["one", "two", "three"]               | ["two", "one"]          | ["one", "four"]                  | ["one", "four"]                  |
| array of scalars | tags       | ["one", "two", "three"]               | []                      | ["one", "two", "five"]           | ["five"]                         |
| array of scalars | tags       | ["one", "two", "two"]                 | ["two", "one", "three"] | ["three", "three", "one"]        | ["one", "three"]                 |
| array of scalars | index      | ["logs-*", "endgame-*", "endpoint-*"] | ["Logs-*", "endgame-*"] | ["logs-*", "endgame-*", "new-*"] | ["Logs-*", "endgame-*", "new-*"] |
| array of scalars | index      | ["logs-*"]                            | ["logs-*", "Logs-*"]    | ["logs-*", "new-*"]              | ["logs-*", "Logs-*", "new-*"]    |
```

### Rule field has an update and a custom value that are the same and the rule base version doesn't exist - `-AA`

#### **Scenario: `-AA` - Rule field is any type**

**Automation**: 3 integration tests with mock rules + a set of unit tests for each algorithm

```Gherkin
Given at least 1 installed prebuilt rule has a new version available
And the base version of the rule cannot be determined
And customized <field_name> field is the same as the Elastic update in this upgrade (current version == target version)
Then for <field_name> field the diff algorithm should output the current version as the merged one without a conflict
And <field_name> field should not be returned from the `upgrade/_review` API endpoint
And <field_name> field should not be shown in the upgrade preview UI

Examples:
| algorithm          | field_name | base_version | current_version         | target_version          | merged_version          |
| single line string | name       | N/A          | "A"                     | "A"                     | "A"                     |
| number             | risk_score | N/A          | 1                       | 1                       | 1                       |
| array of scalars   | tags       | N/A          | ["one", "three", "two"] | ["three", "one", "two"] | ["one", "three", "two"] |
```

### Rule field has an update and a custom value that are NOT the same and the rule base version doesn't exist - `-BC`

#### **Scenario: `-BC` - Rule field is a number or single line string**

**Automation**: 2 integration tests with mock rules + a set of unit tests for the algorithms

```Gherkin
Given at least 1 installed prebuilt rule has a new version available
And the base version of the rule cannot be determined
And customized <field_name> field is different than the Elastic update in this upgrade (current version != target version)
Then for <field_name> field the diff algorithm should output the target version as the merged one with a solvable conflict
And <field_name> field should be returned from the `upgrade/_review` API endpoint
And <field_name> field should be shown in the upgrade preview UI

Examples:
| algorithm          | field_name | base_version | current_version | target_version  | merged_version |
| single line string | name       | N/A          | "B"             | "C"             | "C"            |
| number             | risk_score | N/A          | 2               | 3               | 3              |
```

#### **Scenario: `-BC` - Rule field is an array of scalar values**

**Automation**: 1 integration test with mock rules + a set of unit tests for the algorithm

```Gherkin
Given <field_name> field is customized by the user (current version != base version)
And <field_name> field is updated by Elastic in this upgrade (target version != base version)
And customized <field_name> field is different than the Elastic update in this upgrade (current version != target version)
Then for <field_name> field the diff algorithm should output a custom merged version with a solvable conflict
And arrays should be deduplicated before comparison
And arrays should be compared sensitive of case
And arrays should be compared agnostic of order
And <field_name> field should be returned from the `upgrade/_review` API endpoint
And <field_name> field should be shown in the upgrade preview UI


Examples:
| algorithm        | field_name | base_version | current_version        | target_version         | merged_version                 |
| array of scalars | tags       | N/A          | ["one", "two", "four"] | ["one", "two", "five"] | ["one", "two", "four", "five"] |
```
