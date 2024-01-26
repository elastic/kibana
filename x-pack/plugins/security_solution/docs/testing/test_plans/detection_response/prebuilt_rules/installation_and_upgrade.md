# Installation and Upgrade of Prebuilt Rules

This is a test plan for the workflows of installing and upgrading prebuilt rules.

Status: `in progress`. The current test plan matches `Milestone 2` of the [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic. It does not cover any past functionality that was removed or functionality to be implemented in the future. The plan is about to change in the future Milestones.

## Useful information

### Tickets

- [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic
- [Ensure full test coverage for existing workflows of installing and upgrading prebuilt rules](https://github.com/elastic/kibana/issues/148176)
- [Write test plan and add test coverage for the new workflows of installing and upgrading prebuilt rules](https://github.com/elastic/kibana/issues/148192)
- [Document the new UI for installing and upgrading prebuilt detection rules](https://github.com/elastic/security-docs/issues/3496)

### Terminology

- **EPR**: [Elastic Package Registry](https://github.com/elastic/package-registry), service that hosts our **Package**.

- **Package**: `security_detection_engine` Fleet package that we use to distribute prebuilt detection rules in the form of `security-rule` assets (saved objects).

- **Real package**: actual latest stable package distributed and pulled from EPR via Fleet.

- **Mock rules**: `security-rule` assets that are indexed into the `.kibana_security_solution` index directly in the test setup, either by using the ES client _in integration tests_ or by an API request _in Cypress tests_.

- **Air-gapped environment**: an environment where Kibana doesn't have access to the internet. In general, EPR is not available in such environments, except the cases when the user runs a custom EPR inside the environment.

- **CTA**: "call to action", usually a button, a link, or a callout message with a button, etc, that invites the user to do some action.
  - CTA to install prebuilt rules - at this moment, it's a link button with a counter (implemented) and a callout with a link button (not yet implemented) on the Rule Management page.
  - CTA to upgrade prebuilt rules - at this moment, it's a tab with a counter (implemented) and a callout with a link button (not yet implemented) on the Rule Management page.

### Assumptions

- Below scenarios only apply to prebuilt detection rules.
- Users should be able to install and upgrade prebuilt rules on the `Basic` license and higher.
- EPR is available for fetching the package unless explicitly indicated otherwise.
- Only the latest **stable** package is checked for installation/upgrade and pre-release packages are ignored.

### Non-functional requirements

- Notifications, rule installation and rule upgrade workflows should work:
  - regardless of the package type: with historical rule versions or without;
  - regardless of the package registry availability: i.e., they should also work in air-gapped environments.
- Rule installation and upgrade workflows should work with packages containing up to 15000 historical rule versions. This is the max number of versions of all rules in the package. This limit is enforced by Fleet.
- Kibana should not crash with Out Of Memory exception during package installation.
- For test purposes, it should be possible to use detection rules package versions lower than the latest.

### Functional requirements

- User should be able to install prebuilt rules with and without previewing what exactly they would install (rule properties).
- User should be able to upgrade prebuilt rules with and without previewing what updates they would apply (rule properties of target rule versions).
- If user chooses to preview a prebuilt rule to be installed/upgraded, we currently show this preview in a flyout.
- In the prebuilt rule preview a tab that doesn't have any sections should not be displayed and a section that doesn't have any properties also should not be displayed.

Examples of rule properties we show in the prebuilt rule preview flyout:

```Gherkin
Examples:
| rule_type         | property                          | tab                 | section             |
│ All rule types    │ Author                            │ Overview            │ About               │
│ All rule types    │ Building block                    │ Overview            │ About               │
│ All rule types    │ Severity                          │ Overview            │ About               │
│ All rule types    │ Severity override                 │ Overview            │ About               │
│ All rule types    │ Risk score                        │ Overview            │ About               │
│ All rule types    │ Risk score override               │ Overview            │ About               │
│ All rule types    │ Reference URLs                    │ Overview            │ About               │
│ All rule types    │ False positive examples           │ Overview            │ About               │
│ All rule types    │ Custom highlighted fields         │ Overview            │ About               │
│ All rule types    │ License                           │ Overview            │ About               │
│ All rule types    │ Rule name override                │ Overview            │ About               │
│ All rule types    │ MITRE ATT&CK™                     │ Overview            │ About               │
│ All rule types    │ Timestamp override                │ Overview            │ About               │
│ All rule types    │ Tags                              │ Overview            │ About               │
│ All rule types    │ Type                              │ Overview            │ Definition          │
│ All rule types    │ Related integrations              │ Overview            │ Definition          │
│ All rule types    │ Required fields                   │ Overview            │ Definition          │
│ All rule types    │ Timeline template                 │ Overview            │ Definition          │
│ All rule types    │ Runs every                        │ Overview            │ Schedule            │
│ All rule types    │ Additional look-back time         │ Overview            │ Schedule            │
│ All rule types    │ Setup guide                       │ Overview            │ Setup guide         │
│ All rule types    │ Investigation guide               │ Investigation guide │ Investigation guide │
│ Custom Query      │ Index patterns                    │ Overview            │ Definition          │
│ Custom Query      │ Data view ID                      │ Overview            │ Definition          │
│ Custom Query      │ Data view index pattern           │ Overview            │ Definition          │
│ Custom Query      │ Custom query                      │ Overview            │ Definition          │
│ Custom Query      │ Filters                           │ Overview            │ Definition          │
│ Custom Query      │ Saved query name                  │ Overview            │ Definition          │
│ Custom Query      │ Saved query filters               │ Overview            │ Definition          │
│ Custom Query      │ Saved query                       │ Overview            │ Definition          │
│ Custom Query      │ Suppress alerts by                │ Overview            │ Definition          │
│ Custom Query      │ Suppress alerts for               │ Overview            │ Definition          │
│ Custom Query      │ If a suppression field is missing │ Overview            │ Definition          │
│ Machine Learning  │ Anomaly score threshold           │ Overview            │ Definition          │
│ Machine Learning  │ Machine Learning job              │ Overview            │ Definition          │
│ Threshold         │ Threshold                         │ Overview            │ Definition          │
│ Threshold         │ Index patterns                    │ Overview            │ Definition          │
│ Threshold         │ Data view ID                      │ Overview            │ Definition          │
│ Threshold         │ Data view index pattern           │ Overview            │ Definition          │
│ Threshold         │ Custom query                      │ Overview            │ Definition          │
│ Threshold         │ Filters                           │ Overview            │ Definition          │
│ Event Correlation │ EQL query                         │ Overview            │ Definition          │
│ Event Correlation │ Filters                           │ Overview            │ Definition          │
│ Event Correlation │ Index patterns                    │ Overview            │ Definition          │
│ Event Correlation │ Data view ID                      │ Overview            │ Definition          │
│ Event Correlation │ Data view index pattern           │ Overview            │ Definition          │
│ Indicator Match   │ Indicator index patterns          │ Overview            │ Definition          │
│ Indicator Match   │ Indicator mapping                 │ Overview            │ Definition          │
│ Indicator Match   │ Indicator filters                 │ Overview            │ Definition          │
│ Indicator Match   │ Indicator index query             │ Overview            │ Definition          │
│ Indicator Match   │ Index patterns                    │ Overview            │ Definition          │
│ Indicator Match   │ Data view ID                      │ Overview            │ Definition          │
│ Indicator Match   │ Data view index pattern           │ Overview            │ Definition          │
│ Indicator Match   │ Custom query                      │ Overview            │ Definition          │
│ Indicator Match   │ Filters                           │ Overview            │ Definition          │
│ New Terms         │ Fields                            │ Overview            │ Definition          │
│ New Terms         │ History Window Size               │ Overview            │ Definition          │
│ New Terms         │ Index patterns                    │ Overview            │ Definition          │
│ New Terms         │ Data view ID                      │ Overview            │ Definition          │
│ New Terms         │ Data view index pattern           │ Overview            │ Definition          │
│ New Terms         │ Custom query                      │ Overview            │ Definition          │
│ New Terms         │ Filters                           │ Overview            │ Definition          │
│ ESQL              │ ESQL query                        │ Overview            │ Definition          │
```

## Scenarios

### Package installation

#### **Scenario: Package is installed via Fleet**

**Automation**: 2 e2e tests that install the real package.

```Gherkin
Given the package is not installed
When user opens the Rule Management page
Then the package gets installed in the background from EPR
```

#### **Scenario: Package is installed via bundled Fleet package in Kibana**

**Automation**: 2 integration tests.

```Gherkin
Given the package is not installed
And user is in an air-gapped environment
When user opens the Rule Management page
Then the package gets installed in the background from packages bundled into Kibana
```

#### **Scenario: Large package can be installed on a small Kibana instance**

**Automation**: 1 integration test.

```Gherkin
Given the package is not installed
And the package contains the largest amount of historical rule versions (15000)
And the Kibana instance has a memory heap size of 700 Mb (see note below)
When user opens the Rule Management page
Then the package is installed without Kibana crashing with an Out Of Memory error
```

**Note**: 600 Mb seems to always crash Kibana with an OOM error. 700 Mb runs with no issues in the Flaky test runner with 100 iterations: https://buildkite.com/elastic/kibana-flaky-test-suite-runner/builds/2215.

### Rule installation and upgrade via the Prebuilt rules API

There's a legacy prebuilt rules API and a new one. Both should be tested against two types of the package: with and without historical rule versions.

#### **Scenario: API can install all prebuilt rules**

**Automation**: 8 integration tests with mock rules: 4 examples below \* 2 (we split checking API response and installed rules into two different tests).

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
Then the endpoint should return 200 with <install_response>
And N rule objects should be created
And each rule object should have correct id and version

Examples:
  | package_type             | api    | install_response         |
  | with historical versions | legacy | installed: N, updated: 0 |
  | w/o historical versions  | legacy | installed: N, updated: 0 |
  | with historical versions | new    | total: N, succeeded: N   |
  | w/o historical versions  | new    | total: N, succeeded: N   |
```

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`

#### **Scenario: API can install prebuilt rules that are not yet installed**

**Automation**: 4 integration tests with mock rules.

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
And deletes one of the installed rules
And gets prebuilt rules status via status <api>
Then the endpoint should return 200 with <status_response>
When user installs all rules via install <api> again
Then the endpoint should return 200 with <install_response>

Examples:
  | package_type             | api    | status_response  | install_response         |
  | with historical versions | legacy | not_installed: 1 | installed: 1, updated: 0 |
  | w/o historical versions  | legacy | not_installed: 1 | installed: 1, updated: 0 |
  | with historical versions | new    | to_install: 1    | total: 1, succeeded: 1   |
  | w/o historical versions  | new    | to_install: 1    | total: 1, succeeded: 1   |
```

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
  - status: `GET /api/detection_engine/rules/prepackaged/_status`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`
  - status: `GET /internal/detection_engine/prebuilt_rules/status`

#### **Scenario: API can upgrade prebuilt rules that are outdated**

**Automation**: 4 integration tests with mock rules.

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
And new X+1 version of a rule asset <assets_update>
And user gets prebuilt rules status via status <api>
Then the endpoint should return 200 with <status_response>
When user upgrades all rules via upgrade <api>
Then the endpoint should return 200 with <upgrade_response>

Examples:
  | package_type             | api    | assets_update | status_response | upgrade_response         |
  | with historical versions | legacy | gets added    | not_updated: 1  | installed: 0, updated: 1 |
  | w/o historical versions  | legacy | replaces X    | not_updated: 1  | installed: 0, updated: 1 |
  | with historical versions | new    | gets added    | to_upgrade: 1   | total: 1, succeeded: 1   |
  | w/o historical versions  | new    | replaces X    | to_upgrade: 1   | total: 1, succeeded: 1   |
```

TODO: Check why for the legacy API Dmitrii has added 2 integration tests for `rule package with historical versions` instead of 1:

- `should update outdated prebuilt rules when previous historical versions available`
- `should update outdated prebuilt rules when previous historical versions unavailable`

(NOTE: the second scenario tests that, if a new version of a rule is released, it can upgrade the current instance of that rule even if the historical versions of that rule are no longer in the package)

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
  - upgrade: `PUT /api/detection_engine/rules/prepackaged`
  - status: `GET /api/detection_engine/rules/prepackaged/_status`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`
  - upgrade: `POST /internal/detection_engine/prebuilt_rules/upgrade/_perform`
  - status: `GET /internal/detection_engine/prebuilt_rules/status`

#### **Scenario: API does not install or upgrade prebuilt rules if they are up to date**

**Automation**: 4 integration tests with mock rules.

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
And user gets prebuilt rules status via status <api>
Then the endpoint should return 200 with <status_response>
When user calls install <api>
Then the endpoint should return 200 with <install_response>
When user calls upgrade <api>
Then the endpoint should return 200 with <upgrade_response>

Examples:
  | package_type             | api    | status_response                  | install_response         | upgrade_response         |
  | with historical versions | legacy | not_installed: 0, not_updated: 0 | installed: 0, updated: 0 | installed: 0, updated: 0 |
  | w/o historical versions  | legacy | not_installed: 0, not_updated: 0 | installed: 0, updated: 0 | installed: 0, updated: 0 |
  | with historical versions | new    | to_install: 0, to_upgrade: 0     | total: 0, succeeded: 0   | total: 0, succeeded: 0   |
  | w/o historical versions  | new    | to_install: 0, to_upgrade: 0     | total: 0, succeeded: 0   | total: 0, succeeded: 0   |
```

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
  - upgrade: `PUT /api/detection_engine/rules/prepackaged`
  - status: `GET /api/detection_engine/rules/prepackaged/_status`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`
  - upgrade: `POST /internal/detection_engine/prebuilt_rules/upgrade/_perform`
  - status: `GET /internal/detection_engine/prebuilt_rules/status`

### Scenarios for the real package

#### **Scenario: User can install prebuilt rules from scratch, then install new rules and upgrade existing rules from the new package**

**Automation**: 1 integration test with real packages.

```Gherkin
Given there are two package versions: N-1 and N
And the package of N-1 version is installed
When user calls the status endpoint
Then it should return a 200 response with some number of rules to install and 0 rules to upgrade
When user calls the installation/_review endpoint
Then it should return a 200 response matching the response of the status endpoint
When user calls the installation/_perform_ endpoint
Then it should return a 200 response matching the response of the status endpoint
And rules returned in this response should exist as alert saved objects
When user installs the package of N version
Then it should be installed successfully
When user calls the status endpoint
Then it should return a 200 response with some number of new rules to install and some number of rules to upgrade
When user calls the installation/_review endpoint
Then it should return a 200 response matching the response of the status endpoint
When user calls the installation/_perform_ endpoint
Then rules returned in this response should exist as alert saved objects
When user calls the upgrade/_review endpoint
Then it should return a 200 response matching the response of the status endpoint
When user calls the upgrade/_perform_ endpoint
Then rules returned in this response should exist as alert saved objects
```

### Rule installation and upgrade notifications on the Rule Management page

#### **Scenario: User is NOT notified when no prebuilt rules are installed and there are no prebuilt rules assets**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given no prebuilt rules are installed in Kibana
And no prebuilt rule assets exist
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Rule Updates table
```

#### **Scenario: User is NOT notified when all prebuilt rules are installed and up to date**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given all the latest prebuilt rules are installed in Kibana
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Rule Updates table
```

#### **Scenario: User is notified when no prebuilt rules are installed and there are rules available to install**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given no prebuilt rules are installed in Kibana
And there are X prebuilt rules available to install
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see a number of rules available to install (X)
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Rule Updates table
```

#### **Scenario: User is notified when some prebuilt rules can be installed**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are Y more prebuilt rules available to install
And for all X installed rules there are no new versions available
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Rule Updates table
```

#### **Scenario: User is notified when some prebuilt rules can be upgraded**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are no more prebuilt rules available to install
And for Z of the installed rules there are new versions available
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should see a CTA to upgrade prebuilt rules
And user should see the number of rules available to upgrade (Z)
```

#### **Scenario: User is notified when both rules to install and upgrade are available**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are Y more prebuilt rules available to install
And for Z of the installed rules there are new versions available
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
And user should see a CTA to upgrade prebuilt rules
And user should see the number of rules available to upgrade (Z)
```

#### **Scenario: User is notified after a prebuilt rule gets deleted**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are no more prebuilt rules available to install
When user opens the Rule Management page
And user deletes Y prebuilt rules
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
```

### Rule installation workflow: base cases

#### **Scenario: User can install prebuilt rules one by one**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /installation/\* endpoints in integration.

```Gherkin
Given no prebuilt rules are installed in Kibana
And there are X prebuilt rules available to install
When user opens the Add Rules page
Then prebuilt rules available for installation should be displayed in the table
When user installs one individual rule without previewing it
Then success message should be displayed after installation
And the installed rule should be removed from the table
When user navigates back to the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install decreased by 1
```

#### **Scenario: User can install multiple prebuilt rules selected on the page**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /installation/\* endpoints in integration.

```Gherkin
Given no prebuilt rules are installed in Kibana
And there are X prebuilt rules available to install
When user opens the Add Rules page
Then prebuilt rules available for installation should be displayed in the table
When user selects <Y> rules
Then user should see a CTA to install <Y> number of rules
When user clicks the CTA
Then success message should be displayed after installation
And all the installed rules should be removed from the table
When user navigates back to the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install decreased by <Y> number of installed rules

Examples:
  | Y                               |
  | a few rules on the page, e.g. 2 |
  | all rules on the page, e.g. 12  |
```

#### **Scenario: User can install all available prebuilt rules at once**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /installation/\* endpoints in integration.

```Gherkin
Given no prebuilt rules are installed in Kibana
And there are X prebuilt rules available to install
When user opens the Add Rules page
Then prebuilt rules available for installation should be displayed in the table
When user installs all rules
Then success message should be displayed after installation
And all the rules should be removed from the table
And user should see a message indicating that all available rules have been installed
And user should see a CTA that leads to the Rule Management page
When user clicks on the CTA
Then user should be navigated back to Rule Management page
And user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
```

#### **Scenario: Empty screen is shown when all prebuilt rules are installed**

**Automation**: 1 e2e test with mock rules + 1 integration test.

```Gherkin
Given all the available prebuilt rules are installed in Kibana
When user opens the Add Rules page
Then user should see a message indicating that all available rules have been installed
And user should see a CTA that leads to the Rule Management page
```

#### **Scenario: User can preview rules available for installation**

**Automation**: 1 e2e test

```Gherkin
Given no prebuilt rules are installed in Kibana
And there are 2 rules available to install
When user opens the Add Rules page
Then all rules available for installation should be displayed in the table
When user opens the rule preview for the 1st rule
Then the preview should open
When user closes the preview
Then it should disappear
```

#### **Scenario: User can install a rule using the rule preview**

**Automation**: 1 e2e test

```Gherkin
Given no prebuilt rules are installed in Kibana
And there are 2 rules available to install
When user opens the Add Rules page
Then all rules available for installation should be displayed in the table
When user opens the rule preview for the rule
Then the preview should open
When user installs the rule using a CTA in the rule preview
Then the rule should be installed
And a success message should be displayed after installation
And the rule should be removed from the Add Rules table
When user navigates back to the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install as initial number minus 1
```

#### **Scenario: User can see correct rule information in preview before installing**

**Automation**: 1 e2e test

```Gherkin
Given no prebuilt rules are installed in Kibana
And there are X prebuilt rules of all types available to install
When user opens the Add Rules page
Then all X rules available for installation should be displayed in the table
When user opens the rule preview for the 1st rule
Then the preview should open
And all properties of the 1st rule should be displayed in the correct tab and section of the preview (see examples of rule properties above)
When user selects the 2nd rule in the table
Then the preview should be updated
And all properties of the 2nd rule should be displayed in the correct tab and section of the preview (see examples of rule properties above)
And user should be able to repeat this for all X rules
```

#### **Scenario: Tabs and sections without content should be hidden in preview before installing**

**Automation**: 1 e2e test

```Gherkin
Given no prebuilt rules are installed in Kibana
And there is at least 1 rule available to install
And this rule has neither Setup guide nor Investigation guide
When user opens the Add Rules page
Then all rules available for installation should be displayed in the table
When user opens the rule preview for this rule
Then the preview should open
And the Setup Guide section should NOT be displayed in the Overview tab
And the Investigation Guide tab should NOT be displayed
```

### Rule installation workflow: filtering, sorting, pagination

TODO: add scenarios https://github.com/elastic/kibana/issues/166215

### Rule installation workflow: misc cases

#### **Scenario: User opening the Add Rules page sees a loading skeleton until the package installation is completed**

**Automation**: unit tests.

```Gherkin
Given prebuilt rules package is not installed
When user opens the Add Rules page
Then user should see a loading skeleton until the package installation is completed
```

#### **Scenario: User can navigate from the Add Rules page to the Rule Management page via breadcrumbs**

**Automation**: 1 e2e test.

```Gherkin
Given user is on the Add Rules page
When user navigates to the Rule Management page via breadcrumbs
Then the Rule Management page should be displayed
```

### Rule upgrade workflow: base cases

#### **Scenario: User can upgrade prebuilt rules one by one**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /upgrade/\* endpoints in integration.

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And user is on the Rule Management page
When user opens the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
When user upgrades one individual rule without previewing it
Then success message should be displayed after upgrade
And the upgraded rule should be removed from the table
And user should see the number of rules available to upgrade decreased by 1
```

#### **Scenario: User can upgrade multiple prebuilt rules selected on the page**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /upgrade/\* endpoints in integration.

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And user is on the Rule Management page
When user opens the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
When user selects <Z> rules
Then user should see a CTA to upgrade <Z> number of rules
When user clicks the CTA
Then success message should be displayed after upgrade
And all the <Z> upgraded rules should be removed from the table
And user should see the number of rules available to upgrade decreased by <Z> number of upgraded rules

Examples:
  | Z                               |
  | a few rules on the page, e.g. 2 |
  | all rules on the page, e.g. 12  |
```

#### **Scenario: User can upgrade all available prebuilt rules at once**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /upgrade/\* endpoints in integration.

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And user is on the Rule Management page
When user opens the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
When user upgrades all rules
Then success message should be displayed after upgrade
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Rule Updates table
```

#### **Scenario: User can preview rules available for upgrade**

```Gherkin
Given there is at least one prebuilt rule installed in Kibana
And for this rule there is a new version available
And user is on the Rule Management page
When user opens the Rule Updates table
Then this rule should be displayed in the table
When user opens the rule preview for this rule
Then the preview should open
When user closes the preview
Then it should disappear
```

#### **Scenario: User can upgrade a rule using the rule preview**

**Automation**: 1 e2e test

```Gherkin
Given there is at least one prebuilt rule installed in Kibana
And for this rule there is a new version available
And user is on the Rule Management page
When user opens the Rule Updates table
Then this rule should be displayed in the table
When user opens the rule preview for this rule
Then the preview should open
When user upgrades the rule using a CTA in the rule preview
Then the rule should be upgraded to the latest version
And a success message should be displayed after upgrade
And the rule should be removed from the Rule Updates table
And user should see the number of rules available to upgrade as initial number minus 1
```

#### **Scenario: User can see correct rule information in preview before upgrading**

**Automation**: 1 e2e test

```Gherkin
Given X prebuilt rules of all types are installed in Kibana
And for all of the installed rules there are new versions available
And user is on the Rule Management page
When user opens the Rule Updates table
Then all X rules available for upgrade should be displayed in the table
When user opens the rule preview for the 1st rule
Then the preview should open
And all properties of the new version of the 1st rule should be displayed in the correct tab and section of the preview (see examples of rule properties above)
When user selects the 2nd rule in the table
Then the preview should be updated
And all properties of the new version of the 2nd rule should be displayed in the correct tab and section of the preview (see examples of rule properties above)
And user should be able to repeat this for all X rules
```

#### **Scenario: Tabs and sections without content should be hidden in preview before upgrading**

**Automation**: 1 e2e test

```Gherkin
Given at least 1 prebuilt rule is installed in Kibana
And for this rule there is a new version available
And the updated version of a rule has neither Setup guide nor Investigation guide
And user is on the Rule Management page
When user opens the Rule Updates table
Then all rules available for upgrade should be displayed in the table
When user opens the rule preview for a rule without Setup guide and Investigation guide
Then the preview should open
And the Setup Guide section should NOT be displayed in the Overview tab
And the Investigation Guide tab should NOT be displayed
```

### Rule upgrade workflow: filtering, sorting, pagination

TODO: add scenarios https://github.com/elastic/kibana/issues/166215

### Rule upgrade workflow: misc cases

#### **Scenario: User doesn't see the Rule Updates tab until the package installation is completed**

**Automation**: unit tests.

```Gherkin
Given prebuilt rules package is not installed
When user opens the Rule Management page
Then user should NOT see the Rule Updates tab until the package installation is completed and there are rules available for upgrade
```

### Error handling

#### **Scenario: Error is handled when any operation on prebuilt rules fails**

**Automation**: e2e test with mock rules

```Gherkin
When user is <operation> prebuilt rules
And this operation fails
Then user should see an error message

Examples:
  | operation             |
  | installing all        |
  | installing selected   |
  | installing individual |
  | upgrading all         |
  | upgrading selected    |
  | upgrading individual  |
```

### Authorization / RBAC

#### **Scenario: User with read privileges on Security Solution cannot install prebuilt rules**

**Automation**: 1 e2e test with mock rules + 3 integration tests with mock rules for the status and installation endpoints.

```Gherkin
Given user with "Security: read" privileges on Security Solution
And no prebuilt rules are installed in Kibana
And there are prebuilt rules available to install
When user opens the Add Rules page
Then user should see prebuilt rules available to install
But user should not be able to install them
```

#### **Scenario: User with read privileges on Security Solution cannot upgrade prebuilt rules**

**Automation**: 1 e2e test with mock rules + 3 integration tests with mock rules for the status and upgrade endpoints.

```Gherkin
Given user with "Security: read" privileges on Security Solution
And X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
When user opens the Rule Management page
And user opens the Rule Updates table
Then user should see prebuilt rules available to upgrade
But user should not be able to upgrade them
```

### Kibana upgrade

#### **Scenario: User can use prebuilt rules after upgrading Kibana from version A to B**

**Automation**: not automated, manual testing required.

```Gherkin
Given user is upgrading Kibana from version <A> to version <B>
And the <A> instance contains already installed prebuilt rules
When the upgrade is complete
Then user should be able to install new prebuilt rules
And delete installed prebuilt rules
And upgrade installed prebuilt rules that have newer versions in <B>

Examples:
  | A      | B     |
  | 8.7    | 8.9.0 |
  | 7.17.x | 8.9.0 |
```
