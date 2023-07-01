# Installation and Upgrade of Prebuilt Rules

## Scenarios

### Notifications

#### **Scenario: No callout messages are displayed when there are no pending installs/updates**

```Gherkin
Given user has the latest version of prebuilt rules <prebuilt_rules_status>
When user navigates to the Rule Management page
Then no callout message is displayed for <prebuilt_rules_status> rules
And no badges with number of available rules to install/update are displayed

Examples:
  | prebuilt_rules_status |
  |            to install |
  |             to update |
```

#### **Scenario: Callout message is displayed when there are new prebuilt rules available to install**

```Gherkin
Given user already has 8.x prebuilt rules installed
And there are new prebuilt rules available to install
When user navigates to the Rules Management Page
Then user should see a callout message to install new prebuilt rules
And the number of new rules available to install should be displayed on the +Add Elastic Rules link
```

#### **Scenario: Callout message is displayed when there are new updates on already installed prebuilt rules**

```Gherkin
Given user already has 8.x prebuilt rules installed
And there are new updates available for those prebuilt rules
When users navigate to the Rules Management Page
Then users should see an update callout message
And the number of outdated rules should be displayed on the Rules Updates tab
```

#### **Scenario: User is notified of available prebuilt rules to install when a rule is deleted**

```Gherkin
Given user has the latest version of prebuilt rules installed
When user navigates to Rules Management Page
And user deletes some prebuilt rules
Then user should see a callout message with the same amount of prebuilt rules ready to install
And the updated number of available rules to install should be displayed on the +Add Elastic Rules link
```

#### **Scenario: User is notified that all available rules have been installed in the Add Elastic Rules**

```Gherkin
Given user has all available rules installed
When user navigates to the Add Elastic Rules Page
Then user should see a message indicating that all available rules have been installed
And user should see a CTA that leads to the Rules Management Page
And user should navigate back to Rules Management Page when clicking on the CTA
```

#### **Scenario: User is notified that all installed rules are up to date in the Rule Updates tab**

```Gherkin
Given user has all available rules installed
When user navigates to the Rule Update
Then user should see a message indicating that all installed rules are up to date
```

### Prebuilt Rules Installation

#### **Scenario: User without any installed prebuilt rules can install `<amount>` prebuilt rules**

```Gherkin
Given a user that doesn’t have prebuilt rules installed
When user navigates to Add Elastic Rules Page
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

#### **Scenario: User navigating to the Add Elastic Rules page sees a loading skeleton until the prebuilt rules package installation is completed**

```Gherkin
Given a user that is on Rules Management Page
When user to the Add Elastic Rules page before rules package is installed
Then a loading skeleton is displayed until the installation is completed
```

### Prebuilt Rules Update

#### **Scenario: Users can update prebuilt rules**

```Gherkin
Given user already has 8.x prebuilt rules installed in Kibana
And there are new updates available for those prebuilt rules
And user is on Rules Management Page
When user navigates to the Rules Update tab
Then user should see all the prebuilt rules that have updates available
And user can update outdated prebuilt rules
And successfully updated message is displayed
And Rules Upgrade tab counter is decreased according to the number of updated rules
```

### Package Installation / Rule Installation / Rule Update Failure

#### **Scenario: Error message is displayed when any prebuilt rules operation fails**

```Gherkin
Given user is <action> prebuilt rules
When the installation or update process fails
Then user should see an error message
And prebuilt rules are not installed/updated
And the callout message for pending installs/updates is still displayed on Rules Management Page
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

```Gherkin
Given user navigates to Rules Management Page
And user is running a fresh instance
And rule package installation fails
Then no callouts message should be displayed
And the number of available rules to install and upgrade in the badges does not change
```

### Add Elastic Rules Page

#### **Scenario: New workflow elements are displayed on Rules Management Page**

```Gherkin
Given a user that doesn’t have `security_detection_engine` package installed
When user is on Rules Management Page
Then "+Add Elastic rules" menu with available Rules counter is displayed
And Rule Updates tab is displayed
And "+Add Elastic rules" button is displayed on empty Rules Table
```

#### **Scenario: Rules settings persist on Add Elastic Rules table**

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

```Gherkin
Given a user is on Add Rules Page
When user navigates back to Rules Management page
Then Rules Management Page is properly displayed
```

#### **Scenario: User can filter prebuilt rules by rule name or by tag**

```Gherkin
Given a user is on Add Rules Page
When user filters by <filter>
Then Add Rules Table is properly updated

Examples:
  | filter                  |
  | rule name on search bar |
  | Tag filter              |
```

### Rule Updates tab

#### **Scenario: Rules settings persist on Rule Updates table**

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

```Gherkin
Given a user is on Rule Updates tab
When user navigates back to Rules Management page
Then Rules Management Page is properly displayed
```

#### **Scenario: User can filter prebuilt rules by rule name or by tag**

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

```Gherkin
Given a user with Security: read privileges on Security solution
When user navigates to Add Elastic Rules Page
Then user can see available prebuilt rules to install
And user cannot Install those prebuilt rules
```

#### **Scenario: User with read privileges on security solution cannot update prebuilt rules**

```Gherkin
Given a user with Security: read privileges on Security solution
When user navigates to Rule Updates Tab on Rules Management Page
Then user can see new updates for installed prebuilt rules
And user cannot Update those prebuilt rules
```

### Kibana upgrade

#### **Scenario: User can operate with prebuilt rules when user upgrades from version `<version>` to 8.9 version**

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
