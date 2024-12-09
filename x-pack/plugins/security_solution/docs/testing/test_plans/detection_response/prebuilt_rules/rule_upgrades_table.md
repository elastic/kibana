# Upgrade of Prebuilt Rules from Rule Updates table

This test plan outlines the testing strategy for the **Upgrade of Prebuilt Rules** feature within the **Rule Updates** tab of the Rules Management table.

The focus is on ensuring that both the individual and the bulk upgrade functionality operate correctly, especially in scenarios involving rule conflicts.

## Table of Contents

- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Test Scenarios](#test-scenarios)
  - [Individual Rule Upgrade](#individual-rule-upgrade)
    - [**Scenario: Upgrade conflict-free rule**](#scenario-upgrade-conflict-free-rule)
    - [**Scenario: Attempt to upgrade conflicting rule**](#scenario-attempt-to-upgrade-conflicting-rule)
  - [UI Elements Validation](#ui-elements-validation)
    - [**Scenario: Verify presence of "Upgrade All" button**](#scenario-verify-presence-of-upgrade-all-button)
    - [**Scenario: Confirm tooltips explain exclusion of conflicting rules**](#scenario-confirm-tooltips-explain-exclusion-of-conflicting-rules)
  - [Upgrade All Button](#upgrade-all-button)
    - [**Scenario: All rules are conflict-free**](#scenario-all-rules-are-conflict-free)
    - [**Scenario: Some rules have conflicts**](#scenario-some-rules-have-conflicts)
  - [Bulk Upgrade with Conflict Modal](#bulk-upgrade-with-conflict-modal)
    - [**Scenario: Mixed selection with conflicts**](#scenario-mixed-selection-with-conflicts)
    - [**Scenario: All selected rules have conflicts**](#scenario-all-selected-rules-have-conflicts)
  - [Error Handling](#error-handling)
    - [**Scenario: Backend error during bulk upgrade**](#scenario-backend-error-during-bulk-upgrade)
    - [**Scenario: Network failure during upgrade**](#scenario-network-failure-during-upgrade)
  - [Non-functional Validation](#non-functional-validation)
    - [**Scenario: Performance under high rule counts**](#scenario-performance-under-high-rule-counts)
    - [**Scenario: UI responsiveness during bulk operations**](#scenario-ui-responsiveness-during-bulk-operations)
  - [Additional Scenarios](#additional-scenarios)
    - [**Scenario: Upgrade All with tooltip for excluded rules**](#scenario-upgrade-all-with-tooltip-for-excluded-rules)
    - [**Scenario: Confirmation before bulk upgrade**](#scenario-confirmation-before-bulk-upgrade)
    - [**Scenario: Displaying excluded rules count after bulk upgrade**](#scenario-displaying-excluded-rules-count-after-bulk-upgrade)


### Functional Requirements

1. **Individual Rule Upgrade**:
   - Allow users to upgrade individual rules directly if they are conflict-free.
   - Disable direct upgrade for rules with conflicts until they are reviewed.
   - Provide appropriate tooltips for rules with conflicts that cannot be upgraded directly, clearly explaining users why direct upgrade is disabled.

2. **Bulk Rule Upgrade**:
   - Allow users to upgrade all or multiple selected rules that are conflict-free.
   - Display a modal when selected rules include conflicts, allowing users to proceed with upgrading only the conflict-free rules.

3. **Rule Version Target**:
   - Upgrade rules to the **merged** version instead of the target version.

4. **Error Handling**:
   - Gracefully handle backend and network errors during the upgrade process.

### Non-functional Requirements

   - Ensure performance and responsiveness, especially when a large number of rules is updated in bulk.

---

## Test Scenarios

### Individual Rule Upgrade

#### **Scenario: Upgrade conflict-free rule**

**Automation**: 1 e2e test.

```Gherkin
Given the user is on the Rule Updates tab
And there is a rule with an available update and no conflicts
When the user clicks the upgrade "Upgrade rule" button for that rule
Then the rule should be upgraded to its merged version
And a success message "Rule 'Detect SSH Brute Force' has been upgraded." should be displayed
```

#### **Scenario: Attempt to upgrade conflicting rule**

**Automation**: 1 e2e test.

```Gherkin
Given the user is on the Rule Updates tab
And there is a rule with an available update and at least one conflict
When the user attemps to click the upgrade "Upgrade rule" button for that rule
Then the upgrade button should be disabled
And a tooltip should be displayed on hover that indicates "Please resolve conflicts before upgrading this rule."
```

---

### UI Elements Validation

#### **Scenario: Verify presence of "Upgrade All" button**

**Automation**: 1 e2e test with mock rules.

```Gherkin
Given the user is on the Rule Updates tab
When the page loads
Then the "Upgrade All" button should be visible
```

#### **Scenario: Confirm tooltips explain exclusion of conflicting rules**

**Automation**: 1 e2e test.

```Gherkin
Given the user hovers over the "Upgrade All" button
Then a tooltip should appear with the text "Only rules without conflicts will be upgraded."
```

---

### Upgrade All Button

#### **Scenario: All rules are conflict-free**

**Automation**: 1 e2e test.

```Gherkin
Given there are 10 rules with no conflicts
And the user is on the Rule Updates tab
When the user clicks the "Upgrade All" button
Then all 10 rules should be upgraded to their merged versions
And a success message "All rules have been successfully upgraded." should be displayed
```

#### **Scenario: Some rules have conflicts**

**Automation**: 1 e2e test.

```Gherkin
Given there are 10 rules, 7 without conflicts and 3 with conflicts
And the user is on the Rule Updates tab
When the user clicks the "Upgrade All" button
Then only the 7 conflict-free rules should be upgraded to their merged versions
And a notification should inform the user that 3 rules were skipped due to conflicts
```

---

### Bulk Upgrade with Conflict Modal

#### **Scenario: Mixed selection with conflicts**

**Automation**: 1 e2e test.

```Gherkin
Given the user selects 5 rules for bulk upgrade
And 2 of the selected rules have conflicts
When the user initiates the bulk upgrade action
Then a modal should appear listing the 2 conflicting rules
And the modal should allow the user to proceed with upgrading the remaining 3 conflict-free rules
```

#### **Scenario: All selected rules have conflicts**

**Automation**: 1 e2e test.

```Gherkin
Given the user selects 4 rules for bulk upgrade
And all 4 selected rules have conflicts
When the user initiates the bulk upgrade action
Then a modal should appear informing the user that none of the selected rules can be upgraded in bulk due to conflicts
And the user should not be able to proceed with the upgrade
```

---

### Error Handling

#### **Scenario: Backend error during bulk upgrade**

**Automation**: 1 e2e test.

```Gherkin
Given the user initiates a bulk upgrade of 10 rules
And a backend error occurs during the upgrade process
When the system receives the error response
Then an error message "An error occurred while upgrading rules. Please try again later." should be displayed
And none of the rules should be upgraded
```

#### **Scenario: Network failure during upgrade**

**Automation**: 1 e2e test.

```Gherkin
Given the user initiates a bulk upgrade of 5 rules
And a network failure occurs during the upgrade process
When the system detects the network failure
Then an error message "Network error: Unable to complete the upgrade. Please check your connection and retry." should be displayed
And the user should have the option to retry the upgrade
```

---

### Non-functional Validation

#### **Scenario: Performance under high rule counts**

**Automation**: 1 e2e test.

```Gherkin
Given the user has 10,000 conflict-free rules available for upgrade
When the user clicks the "Upgrade All" button
Then all 10,000 rules should be upgraded within 2 minutes
And the system should remain responsive throughout the process
```

#### **Scenario: UI responsiveness during bulk operations**

**Automation**: 1 e2e test.

```Gherkin
Given the user initiates a bulk upgrade of 500 rules
When the upgrade process is ongoing
Then the user should be able to navigate to other tabs without delay
And the UI should display a loading indicator without freezing
```

---

### Additional Scenarios

#### **Scenario: Upgrade All with tooltip for excluded rules**

**Automation**: 1 e2e test.

```Gherkin
Given there are 20 rules available for upgrade
And 5 of them have conflicts
When the user hovers over the "Upgrade All" button
Then the tooltip should display "Upgrading 15 rules. 5 rules have conflicts and will not be upgraded."
```

#### **Scenario: Confirmation before bulk upgrade**

**Automation**: 1 e2e test.

```Gherkin
Given the user has selected 10 conflict-free rules for upgrade
When the user clicks the "Upgrade All" button
Then a confirmation dialog should appear with the message "Are you sure you want to upgrade 10 rules?"
And the user should have the options to "Confirm" or "Cancel"
When the user clicks "Confirm"
Then the 10 rules should be upgraded
And a success message "10 rules have been successfully upgraded." should be displayed
```

#### **Scenario: Displaying excluded rules count after bulk upgrade**

**Automation**: 1 e2e test.

```Gherkin
Given the user initiates a bulk upgrade of 50 rules
And 10 of them have conflicts
When the upgrade process completes
Then a notification should display "40 rules have been upgraded. 10 rules were excluded due to conflicts."
```

---
