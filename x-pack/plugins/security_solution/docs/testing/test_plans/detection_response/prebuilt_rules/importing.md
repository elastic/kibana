Feature: Importing Prebuilt Rules

  Scenario: Importing an unmodified prebuilt rule with a matching rule_id and version
    Given the import payload contains a prebuilt rule with a matching rule_id and version
    When the user imports the rule
    Then the rule should be created or updated
    And the ruleSource type should be "external"
    And isCustomized should be  false

  Scenario: Importing a prebuilt rule with a matching rule_id but no matching version
    Given the import payload contains a prebuilt rule with a matching rule_id but no matching version
    When the user imports the rule
    Then the rule should be created or updated
    And the ruleSource type should be "external"
    And isCustomized should be true

  Scenario: Importing a prebuilt rule with a non-existent rule_id
    Given the import payload contains a prebuilt rule with a non-existent rule_id
    When the user imports the rule
    Then the rule should be created
    And the ruleSource type should be "internal"

  Scenario: Importing a prebuilt rule without a rule_id field
    Given the import payload contains a prebuilt rule without a rule_id field
    When the user imports the rule
    Then the import should be rejected with a message "rule_id field is required"

  Scenario: Importing a prebuilt rule without a version field
    Given the import payload contains a prebuilt rule without a version field
    When the user imports the rule
    Then the import should be rejected with a message "version field is required"

  Scenario: Importing a customized prebuilt rule with a matching rule_id and version
    Given the import payload contains a customized prebuilt rule with a matching rule_id and version
    When the user imports the rule
    Then the rule should be created or updated
    And the ruleSource type should be "external"
    And isCustomized should be true

  Scenario: Importing a customized prebuilt rule with a matching rule_id but no matching version
    Given the import payload contains a customized prebuilt rule with a matching rule_id but no matching version
    When the user imports the rule
    Then the rule should be created or updated
    And the ruleSource type should be "external"
    And isCustomized should be false

  Scenario: Importing a rule with overwrite flag set to true
    Given the import payload contains a rule with an existing rule_id
    And the overwrite flag is set to true
    When the user imports the rule
    Then the rule should be overwritten
    And the ruleSource type should be calculated based on the rule_id and version

  Scenario: Importing a rule with overwrite flag set to false
    Given the import payload contains a rule with an existing rule_id
    And the overwrite flag is set to false
    When the user imports the rule
    Then the import should be rejected with a message "rule_id already exists"
