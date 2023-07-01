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
- Most of our users are on the 7.17.x version, that’s why the 8.x version is specified on scenarios, because this test plan is considering a minimum version of 8.x.
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

## Scenarios

### Package installation

#### **Scenario: Package is installed via Fleet**

**Coverage**: 0 tests - covered by other scenarios. This scenario will be covered by the **Users install the latest prebuilt rules** scenario, which will include 1 e2e test which installs the rules from the real package.

TODO: Where are scenarios for the real package?

```Gherkin
Given the package is not installed
When user opens the Rule Management page
Then the package gets installed in the background from EPR
```

#### **Scenario: Package is installed via bundled Fleet package in Kibana**

**Coverage**: 1 integration test.

```Gherkin
Given the package is not installed
And user is in an air-gapped environment
When user opens the Rule Management page
Then the package gets installed in the background from packages bundled into Kibana
```

#### **Scenario: Large package can be installed on a small Kibana instance**

**Coverage**: 1 integration test.

```Gherkin
Given the package is not installed
And the package contains the largest amount of historical rule versions (15000)
And the Kibana instance has a memory heap size of X Mb (see note below)
When user opens the Rule Management page
Then the package is installed without Kibana crashing with an Out Of Memory error
```

TODO: Update the `heap size of X Mb` to a concrete value and update the note below.

**Note**: The amount of memory is undefined as of now because, during implementation, we will try to find a memory heap threshold below which Kibana starts to crash constantly when you install the package with 15k rules. The plan is to then increase it to the point where it stops crashing, and use it as our value for this test.

### Rule installation and upgrade via the Prebuilt rules API

There's a legacy prebuilt rules API and a new one. Both should be tested against two types of the package: with and without historical rule versions.

#### **Scenario: API can install all prebuilt rules**

**Coverage**: 8 integration tests with mock rules: 4 examples below * 2 (we split checking API response and installed rules into two different tests).

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

**Coverage**: 4 integration tests with mock rules.

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

**Coverage**: 4 integration tests with mock rules.

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

**Coverage**: 4 integration tests with mock rules.

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

### Rule installation and upgrade notifications on the Rule Management page

#### **Scenario: User is notified when no prebuilt rules are installed**

**Coverage**: 1 e2e test with mock rules + 1 integration test.

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

#### **Scenario: User is NOT notified when all prebuilt rules are installed and up to date**

**Coverage**: 1 e2e test with mock rules + 1 integration test.

```Gherkin
Given all the latest prebuilt rules are installed in Kibana
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Rule Updates table
```

#### **Scenario: User is notified when some prebuilt rules can be installed**

**Coverage**: 1 e2e test with mock rules + 1 integration test.

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

**Coverage**: 1 e2e test with mock rules + 1 integration test.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are no more prebuilt rules available to install
And for Z of the installed rules there are new versions available
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should see a CTA to upgrade prebuilt rules
And user should see the number of rules available to upgrade (Z)
And user should see the Rule Updates table
```

#### **Scenario: User is notified when both rules to install and upgrade are available**

**Coverage**: 1 e2e test with mock rules + 1 integration test.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are Y more prebuilt rules available to install
And for Z of the installed rules there are new versions available
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
And user should see a CTA to upgrade prebuilt rules
And user should see the number of rules available to upgrade (Z)
And user should see the Rule Updates table
```

#### **Scenario: User is notified after a prebuilt rule gets deleted**

**Coverage**: 1 e2e test with mock rules + 1 integration test.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are no more prebuilt rules available to install
When user opens the Rule Management page
And user deletes Y prebuilt rules
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
```

### Rule installation workflow

#### **Scenario: User without any installed prebuilt rules can install `<amount>` prebuilt rules**

**Coverage**: ?.

```Gherkin
Given a user that doesn’t have prebuilt rules installed
When user navigates to Add Rules page
Then available prebuilt rules are displayed on Elastic Rules table
And user can install <amount> prebuilt Rules
And successfully installed message is displayed after installation
And installed rules are removed from Elastic Rules table
And rules to install counter is decreased accordingly

Examples:
  | amount     |
  | all        |
  | selected   |
  | individual |
```

### Rule upgrade workflow

#### **Scenario: Users can update prebuilt rules**

**Coverage**: ?.

```Gherkin
Given user already has 8.x prebuilt rules installed in Kibana
And there are new updates available for those prebuilt rules
And user is on Rule Management page
When user navigates to the Rules Update tab
Then user should see all the prebuilt rules that have updates available
And user can update outdated prebuilt rules
And successfully updated message is displayed
And Rules Upgrade tab counter is decreased according to the number of updated rules
```

### Package installation / rule installation / rule upgrade failure

#### **Scenario: Error message is displayed when any prebuilt rules operation fails**

**Coverage**: ?.

```Gherkin
Given user is <action> prebuilt rules
When the installation or update process fails
Then user should see an error message
And prebuilt rules are not installed/updated
And the callout message for pending installs/updates is still displayed on Rule Management page
And the number of available rules to install and upgrade in the badges does not change

Examples:
  | action                |
  | installing all        |
  | installing selected   |
  | installing individual |
  | updating all          |
  | updating selected     |
  | updating individual   |
```

#### **Scenario: No callout messages are displayed when rule package installation fails and no rules are avialble for install/update**

**Coverage**: ?.

```Gherkin
Given user navigates to Rule Management page
And user is running a fresh instance
And rule package installation fails
Then no callouts message should be displayed
And the number of available rules to install and upgrade in the badges does not change
```

### Add Rules page

#### **Scenario: User opening the Add Rules page sees a loading skeleton until the package installation is completed**

**Coverage**: ?.

```Gherkin
Given prebuilt rules package is not installed
When user opens the Add Rules page
Then user should see a loading skeleton until the package installation is completed
```

#### **Scenario: Empty screen is shown when all prebuilt rules are installed**

**Coverage**: 1 e2e test with mock rules.

```Gherkin
Given user has all the available prebuilt rules installed in Kibana
When user opens the Add Rules page
Then user should see a message indicating that all available rules have been installed
And user should see a CTA that leads to the Rule Management page
When user clicks on the CTA
Then user should be navigated back to Rule Management page
```

#### **Scenario: New workflow elements are displayed on Rule Management page**

**Coverage**: ?.

```Gherkin
Given a user that doesn’t have `security_detection_engine` package installed
When user is on Rule Management page
Then "+Add Elastic rules" menu with available Rules counter is displayed
And Rule Updates tab is displayed
And "+Add Elastic rules" button is displayed on empty Rules Table
```

#### **Scenario: Rules settings persist on Add Elastic Rules table**

**Coverage**: ?.

```Gherkin
Given a user has Rules listed on Add Elastic Rules page
When <case>
Then the available rules state should persist for all the rules

Examples:
  | case                              |
  | user reloads the page             |
  | after switching table pagination  |
  | after filtering and clear filters |
```

#### **Scenario: User can navigate back to Rules Management page**

**Coverage**: ?.

```Gherkin
Given a user is on Add Rules Page
When user navigates back to Rules Management page
Then Rule Management page is properly displayed
```

#### **Scenario: User can filter prebuilt rules by rule name or by tag**

**Coverage**: ?.

```Gherkin
Given a user is on Add Rules Page
When user filters by <filter>
Then Add Rules Table is properly updated

Examples:
  | filter                  |
  | rule name on search bar |
  | Tag filter              |
```

### Rule Updates table

#### **Scenario: Empty screen is shown when all installed prebuilt rules are up to date**

**Coverage**: ?.

```Gherkin
Given user has some prebuilt rules installed in Kibana
And all of them are up to date (have the latest versions)
When user opens the Rule Management page
And selects the Rule Updates tab
Then user should see a message indicating that all installed rules are up to date
```

#### **Scenario: Rules settings persist on Rule Updates table**

**Coverage**: ?.

```Gherkin
Given a user has Rules listed on Rule Updates table
When <case>
Then the rules with available updates state should persist

Examples:
  | case                              |
  | user reloads the page             |
  | after switching table pagination  |
  | after filtering and clear filters |
```

#### **Scenario: User can navigate back to Rules Management tab**

**Coverage**: ?.

```Gherkin
Given a user is on Rule Updates tab
When user navigates back to Rules Management page
Then Rule Management page is properly displayed
```

#### **Scenario: User can filter prebuilt rules by rule name or by tag**

**Coverage**: ?.

```Gherkin
Given a user is on Rule Updates tab
When user filters by <filter>
Then Rule Updates tab is properly updated

Examples:
  | filter                  |
  | rule name on search bar |
  | Tag filter              |
```

### Authorization / RBAC

#### **Scenario: User with read privileges on security solution cannot install prebuilt rules**

**Coverage**: ?.

```Gherkin
Given a user with Security: read privileges on Security solution
When user navigates to Add Rules page
Then user can see available prebuilt rules to install
And user cannot Install those prebuilt rules
```

#### **Scenario: User with read privileges on security solution cannot update prebuilt rules**

**Coverage**: ?.

```Gherkin
Given a user with Security: read privileges on Security solution
When user navigates to Rule Updates Tab on Rule Management page
Then user can see new updates for installed prebuilt rules
And user cannot Update those prebuilt rules
```

### Kibana upgrade

#### **Scenario: User can operate with prebuilt rules when user upgrades from version `<version>` to 8.9 version**

**Coverage**: ?.

```Gherkin
Given a user that is upgrading from version <version> to version 8.9
And the <version> instance contains already installed prebuilt rules
When the upgrade is complete
Then user can install new prebuilt rules
And remove installed prebuilt rules
And update prebuilt rules from <version> to 8.9

Examples:
  | version |
  | 8.7     |
  | 7.17.x  |
```
