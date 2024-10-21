Feature: Exporting Prebuilt Rules

  Scenario: Exporting prebuilt rule individually
    Given a space with prebuilt rules installed 
    When the user selects "Export rule" from the "All actions" dropdown on the rule's page
    Then the rule should be exported as an NDJSON file
    And it should include an "immutable" field with a value of true
    And its "ruleSource" "type" should be "external"
    And its "ruleSource" "isCustomized" value should depend on whether the rule was customized

  Scenario: Exporting prebuilt rules in bulk
    Given a space with prebuilt rules installed 
    When the user selects prebuilt rules in the alerts table
    And chooses "Export" from bulk actions
    Then the selected rules should be exported as an NDJSON file
    And they should include an "immutable" field with a value of true
    And their "ruleSource" "type" should be "external"
    And their "ruleSource" "isCustomized" should depend on whether the rule was customized

  Scenario: Exporting both prebuilt and custom rules in bulk
    Given a space with prebuilt and custom rules installed
    When the user selects prebuilt rules in the alerts table
    And chooses "Export" from bulk actions
    Then the selected rules should be exported as an NDJSON file
    And the prebuilt rules should include an "immutable" field with a value of true
    And the custom rules should include an "immutable" field with a value of false
    And the prebuilt rules' "ruleSource" "type" should be "external"
    And the custom rules' "ruleSource" "type" should be "internal"

  Scenario: Exporting beyond the export limit
    Given a space with prebuilt and custom rules installed
    And the number of rules is greater than the export limit (defaults to 10_000)
    Then the request should be rejected as a bad request
