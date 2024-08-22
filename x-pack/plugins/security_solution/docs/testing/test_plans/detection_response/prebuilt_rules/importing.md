#### **Scenario: User imports unmodified prebuilt rules

```Gherkin
Given an NDJSON file representing unmodified prebuilt rules
When a user opens the Rule Management page
And uploads the file via the Import Rules Modal
Then the rules should be created
And the rules should have a `rule_source.type` of "external"
And the rules should have a `rule_source.is_customized` of "false"
And the rules should have a `rule_source.source_updated_at` equal to the `updated_at` field of the published rule/version
```

#### **Scenario: User imports modified prebuilt rules

```Gherkin
Given an NDJSON file representing modified prebuilt rules
When a user opens the Rule Management page
And uploads the file via the Import Rules Modal
Then the rules should be created
And the rules should have a `rule_source.type` of "external"
And the rules should have a `rule_source.is_customized` of "true"
And the rules should have a `rule_source.source_updated_at` equal to the `updated_at` field of the published rule/version
```

#### **Scenario: User imports unknown prebuilt rules

```Gherkin
Given an NDJSON file representing unknown prebuilt rules
When a user opens the Rule Management page
And uploads the file via the Import Rules Modal
Then the rules should be created
And the rules should have a `rule_source.type` of "external"
And the rules should have a `rule_source.is_customized` of "false"
```

#### TODO Scenarios
#### **Scenario: User imports rules without rule_id (rejected)
#### **Scenario: User imports rules without version (rejected)
