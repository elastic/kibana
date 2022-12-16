# PoC of the rule upgrade and installation workflows

**Resolves:** https://github.com/elastic/kibana/issues/137446

NOTE: You can comment this PR description line-by-line in `security_solution/common/detection_engine/prebuilt_rules/poc/README.md`.

## Summary

- [x] Revisit Figma designs and discuss separation between installation and upgrade workflows.
- [x] Design API endpoints for the rule upgrade and installation workflows.
- [x] Design a domain model that will be used on the frontend to build the rule upgrade UI.
- [x] Design a data model of prebuilt rule assets (2 versions: flat and composite).
  - NOTE: Ended up with 3 versions: one flat and two composite data models.
- [x] Implement helper endpoints for indexing prebuilt rule assets.
- [x] Determine which rule fields will be "customizable" and which will be "technical".
  - NOTE: Mostly done but a few specific fields need to be discussed with the team.
  - Follow-up: https://github.com/elastic/kibana/issues/147239
- [x] Find out which fields are actually used in https://github.com/elastic/detection-rules and if we could remove some of them from the `PrebuiltRuleToInstall` schema
- [x] Design an algorithm that returns a 3-way diff between 3 rule versions: base, current, target.
- [x] Implement PoC API endpoints and make them accept a data model in request parameters.
  - NOTE: Implemented the `status` and two `_review` endpoints. I think we could skip implementing the `_perform` endpoints within this POC because they seem to be less risky (given the `_review` endpoints).
- [x] Clean up. Address `TODO: https://github.com/elastic/kibana/pull/144060` comments.
- [x] Test performance of the implemented API endpoints.
  - NOTE: The flat data model appears to be the most performant. It's up to 2x more performant than the composite models.
- [x] Choose the data model.
  - NOTE: We decided to proceed with the flat data model. We will have to fix several issues on the Fleet side in order to do that:
  - https://github.com/elastic/kibana/issues/147695
  - https://github.com/elastic/kibana/issues/148174
  - https://github.com/elastic/kibana/issues/148175

Open questions to clarify in parallel or later:

- [Discuss with Design] Design a field diff UI for each rule field or set of related fields.
- [Discuss with PM] What should we do when a user installs the Elastic Defend integration?
  - Current behavior: we install and upgrade all prebuilt rules automatically.
  - Proposed change: adjust `server/fleet_integration/handlers/install_prepackaged_rules.ts` to install only the promotion "Endpoint Security" rule if it's not installed. Don't install all the rules and don't upgrade rules.
- [Discuss with PM] How/when do we want to install prebuilt timelines? Should we provide a separate API and UI for that?
  - https://github.com/elastic/kibana/issues/92553
- [Discuss with PM] What should be our rule deprecation workflow? Let's discuss the UX and requirements.
  - https://github.com/elastic/kibana/issues/118942
  - FYI some of the prebuilt rules were deleted in the prebuilt rules repo (https://github.com/elastic/ia-trade-team/issues/84#issuecomment-1332531334)
- Think about advanced features for the future:
  - rollback to the current stock version (revert customizations)
  - upgrade to a given next version
  - downgrade to a given previous version

## Workflows

Stage 1 (both workflows):

1. Call `GET /internal/detection_engine/prebuilt_rules/status`.
1. Show a callout with 1 or 2 CTA buttons (upgrade rules, install new rules).

Stage 2 (upgrade workflow):

1. User clicks "Upgrade X rules" button.
1. Show "Review updates" flyout.
1. Enable the loading indicator.
1. Call `POST /internal/detection_engine/prebuilt_rules/upgrade/_review`.
1. Disable the loading indicator, show the upgrade UI.
1. User selects/deselects rules and fields, resolves conflicts if any.
1. User clicks "Update selected rules" button.
1. Enable the loading indicator.
1. Call `POST /internal/detection_engine/prebuilt_rules/upgrade/_perform`.
1. Disable the loading indicator, close the flyout or show errors.
1. Refresh the Rules table and the status of prebuilt rules.

Stage 2 (installation workflow):

1. User clicks "View Y new rules" button.
1. Show "View new rules" flyout.
1. Enable the loading indicator.
1. Call `POST /internal/detection_engine/prebuilt_rules/installation/_review`.
1. Disable the loading indicator, show the installation UI.
1. User selects/deselects rules to be installed.
1. User clicks "Install selected rules" button.
1. Enable the loading indicator.
1. Call `POST /internal/detection_engine/prebuilt_rules/installation/_perform`.
1. Disable the loading indicator, close the flyout or show errors.
1. Refresh the Rules table and the status of prebuilt rules.

## Data models

This POC implements and compares 3 new data models for historical versioned rule asset saved objects.
See the implementation in `server/lib/detection_engine/prebuilt_rules/logic/poc/saved_objects`.

We will need to choose the one we will proceed with. Criteria considered so far:

- Ability to implement queries needed for implementing the 5 endpoints proposed in this POC.
- Flexibility in querying data in general.
- Performance of querying data.

### Flat model

Every object is a historical rule version that contains the rule id, the content version and the content itself.

`server/lib/detection_engine/prebuilt_rules/logic/poc/saved_objects/rule_asset_flat_saved_objects_type.ts`:

```ts
const SO_TYPE = 'security-rule-flat';

const mappings = {
  dynamic: false,
  properties: {
    name: {
      type: 'keyword',
    },
    rule_id: {
      type: 'keyword',
    },
    rule_content_version: {
      type: 'version',
    },
    stack_version_min: {
      type: 'version',
    },
    stack_version_max: {
      type: 'version',
    },
  },
};
```

### Composite model v1

Every object is a rule, all historical content is stored in its nested field (an array).

`server/lib/detection_engine/prebuilt_rules/logic/poc/saved_objects/rule_asset_composite_saved_objects_type.ts`:

```ts
const SO_TYPE = 'security-rule-composite';

const mappings = {
  dynamic: false,
  properties: {
    rule_id: {
      type: 'keyword',
    },
    versions: {
      type: 'nested',
      properties: {
        name: {
          type: 'keyword',
        },
        rule_content_version: {
          type: 'version',
        },
        stack_version_min: {
          type: 'version',
        },
        stack_version_max: {
          type: 'version',
        },
      },
    },
  },
};
```

### Composite model v2

Every object is a rule. Historical version information is stored as an array of small objects
which is mapped as a nested field. Historical content is stored in a map where keys are formed
in a special way so that we can fetch individual content versions for many rules in bulk.

`server/lib/detection_engine/prebuilt_rules/logic/poc/saved_objects/rule_asset_composite2_saved_objects_type.ts`:

```ts
export const SO_TYPE = 'security-rule-composite2';

interface RuleAssetComposite2Attributes {
  rule_id: string;
  versions: RuleVersionInfo[];
  content: Record<string, PrebuiltRuleContent>;
}

interface RuleVersionInfo {
  rule_content_version: string;
  stack_version_min: string;
  stack_version_max: string;
}

const mappings = {
  dynamic: 'strict',
  properties: {
    rule_id: {
      type: 'keyword',
    },
    versions: {
      type: 'nested',
      properties: {
        rule_content_version: {
          type: 'version',
        },
        stack_version_min: {
          type: 'version',
        },
        stack_version_max: {
          type: 'version',
        },
      },
    },
    content: {
      type: 'flattened',
    },
  },
};
```

## API endpoints

See the implementation in `x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api`.

### Get status of prebuilt rules

```txt
GET /internal/detection_engine/prebuilt_rules/status
```

Response body:

```ts

export interface GetPrebuiltRulesStatusResponseBody {
  status_code: number;
  message: string;
  attributes: {
    /** Aggregated info about all prebuilt rules */
    stats: PrebuiltRulesStatusStats;
  };
}

export interface PrebuiltRulesStatusStats {
  /** Total number of existing (known) prebuilt rules */
  num_prebuilt_rules_total: number; // do we need it?
  /** Number of installed prebuilt rules */
  num_prebuilt_rules_installed: number; // do we need it?
  /** Number of prebuilt rules available for installation (not yet installed) */
  num_prebuilt_rules_to_install: number;
  /** Number of installed prebuilt rules available for upgrade (stock + customized) */
  num_prebuilt_rules_to_upgrade: number;

  /** Signature ids ("rule_id") of prebuilt rules available for installation (not yet installed) */
  rule_ids_to_install: string[];
  /** Signature ids ("rule_id") of installed prebuilt rules available for upgrade (stock + customized) */
  rule_ids_to_upgrade: string[];

  // In the future we could add more stats such as:
  // - number of installed prebuilt rules which were deprecated
  // - number of installed prebuilt rules which are not compatible with the current version of Kibana
}
```

Implementation: `server/lib/detection_engine/prebuilt_rules/api/get_prebuilt_rules_status/route.ts`.

### Review rules that can be upgraded

```txt
POST /internal/detection_engine/prebuilt_rules/upgrade/_review
```

Response body:

```ts
export interface ReviewRuleUpgradeResponseBody {
  status_code: number;
  message: string;
  attributes: {
    /** Aggregated info about all rules available for upgrade */
    stats: RuleUpgradeStatsForReview;
    /** Info about individual rules: one object per each rule available for upgrade */
    rules: RuleUpgradeInfoForReview[];
  };
}

export interface RuleUpgradeStatsForReview {
  /** Number of installed prebuilt rules available for upgrade (stock + customized) */
  num_rules_to_upgrade: number;
  /** Number of installed prebuilt rules available for upgrade which are stock (non-customized) */
  num_stock_rules_to_upgrade: number;
  /** Number of installed prebuilt rules available for upgrade which are customized by the user */
  num_customized_rules_to_upgrade: number;
  /** A union of all tags of all rules available for upgrade */
  tags: RuleTagArray;
  /** A union of all fields "to be upgraded" across all the rules available for upgrade. An array of field names. */
  fields: string[];
}

export interface RuleUpgradeInfoForReview {
  id: RuleObjectId;
  rule_id: RuleSignatureId;
  rule: DiffableRule;
  diff: {
    fields: {
      name?: ThreeWayDiff<RuleName>;
      description?: ThreeWayDiff<RuleDescription>;
      // etc; only fields that have some changes or conflicts will be returned
    };
    has_conflict: boolean;
  };
}
```

Implementation: `server/lib/detection_engine/prebuilt_rules/api/review_rule_upgrade/route.ts`.

### Perform rule upgrade

```txt
POST /internal/detection_engine/prebuilt_rules/upgrade/_perform
```

Request body:

```ts
export interface PerformRuleUpgradeRequestBody {
  mode: 'ALL_RULES' | 'SPECIFIC_RULES';
  pick_version?: 'BASE' | 'CURRENT' | 'TARGET' | 'MERGED';
  rules: SingleRuleUpgradeRequest[]; // required if mode is SPECIFIC_RULES
}

export interface SingleRuleUpgradeRequest {
  id: RuleObjectId;
  pick_version?: 'BASE' | 'CURRENT' | 'TARGET' | 'MERGED';
  fields?: {
    name?: FieldUpgradeRequest<RuleName>;
    description?: FieldUpgradeRequest<RuleDescription>;
    // etc
    // Every non-specified field will default to pick_version: 'MERGED'.
    // If pick_version is MERGED and there's a merge conflict the endpoint will throw.
  };

  /**
   * This parameter is needed for handling race conditions with Optimistic Concurrency Control.
   * Two or more users can call upgrade/_review and upgrade/_perform endpoints concurrently.
   * Also, in general the time between these two calls can be anything.
   * The idea is to only allow the user to upgrade a rule if the user has reviewed the exact version
   * of it that had been returned from the _review endpoint. If the version changed on the BE,
   * upgrade/_perform endpoint will return a version mismatch error for this rule.
   */
  rule_content_version: SemanticVersion;

  /**
   * This parameter is needed for handling race conditions with Optimistic Concurrency Control.
   * Two or more users can call upgrade/_review and upgrade/_perform endpoints concurrently.
   * Also, in general the time between these two calls can be anything.
   * The idea is to only allow the user to upgrade a rule if the user has reviewed the exact revision
   * of it that had been returned from the _review endpoint. If the revision changed on the BE,
   * upgrade/_perform endpoint will return a revision mismatch error for this rule.
   */
  rule_revision: number;
}

export interface FieldUpgradeRequest<T> {
  pick_version: 'BASE' | 'CURRENT' | 'TARGET' | 'MERGED' | 'RESOLVED';
  resolved_value: T; // required if pick_version is RESOLVED; type depends on the rule field type
}
```

Response body:

```ts
export interface PerformRuleUpgradeResponseBody {
  status_code: number;
  message: string;
  attributes: {
    summary: {
      total: number;
      succeeded: number:
      skipped: number;
      failed: number;
    };
    results: {
      updated: RuleResponse[];
      skipped: Array<{
        rule_id: RuleSignatureId;
        reason_code: 'RULE_NOT_FOUND' | 'RULE_UP_TO_DATE'; // or anything else
      }>;
    };
    errors: Array<{
      message: string;
      error_code: string; // maybe not needed for now
      status_code: number;
      rules: Array<{
        rule_id: RuleSignatureId;
        name?: string;
      }>;
    }>;
  }
}
```

Implementation: not implemented in this POC.

### Review rules that can be installed

```txt
POST /internal/detection_engine/prebuilt_rules/installation/_review
```

Response body:

```ts
export interface ReviewRuleInstallationResponseBody {
  status_code: number;
  message: string;
  attributes: {
    /** Aggregated info about all rules available for installation */
    stats: RuleInstallationStatsForReview;
    /** Info about individual rules: one object per each rule available for installation */
    rules: RuleInstallationInfoForReview[];
  };
}

export interface RuleInstallationStatsForReview {
  /** Number of prebuilt rules available for installation */
  num_rules_to_install: number;
  /** A union of all tags of all rules available for installation */
  tags: RuleTagArray;
}

// Option 1: rule ids and versions + all fields from DiffableRule
// Option 2: rule ids and versions + selected fields from DiffableRule (depending on the rule type)
export type RuleInstallationInfoForReview = DiffableRule & {
  rule_id: RuleSignatureId;
  rule_content_version: SemanticVersion;
  stack_version_min: SemanticVersion;
  stack_version_max: SemanticVersion;
};
```

Implementation: `server/lib/detection_engine/prebuilt_rules/api/review_rule_installation/route.ts`.

### Perform rule installation

```txt
POST /internal/detection_engine/prebuilt_rules/installation/_perform
```

Request body:

```ts
export interface PerformRuleInstallationRequestBody {
  mode: `ALL_RULES` | `SPECIFIC_RULES`;
  rules: SingleRuleInstallationRequest[]; // required if mode is `SPECIFIC_RULES`
}

export interface SingleRuleInstallationRequest {
  rule_id: RuleSignatureId;

  /**
   * This parameter is needed for handling race conditions with Optimistic Concurrency Control.
   * Two or more users can call installation/_review and installation/_perform endpoints concurrently.
   * Also, in general the time between these two calls can be anything.
   * The idea is to only allow the user to install a rule if the user has reviewed the exact version
   * of it that had been returned from the _review endpoint. If the version changed on the BE,
   * installation/_perform endpoint will return a version mismatch error for this rule.
   */
  rule_content_version: SemanticVersion;
}
```

Response body:

```ts
export interface PerformRuleInstallationResponseBody {
  status_code: number;
  message: string;
  attributes: {
    summary: {
      total: number;
      succeeded: number:
      skipped: number;
      failed: number;
    };
    results: {
      created: RuleResponse[];
      skipped: Array<{
        rule_id: RuleSignatureId;
        reason_code: 'RULE_NOT_FOUND' | 'RULE_INSTALLED'; // or anything else
      }>;
    };
    errors: Array<{
      message: string;
      error_code: string; // maybe not needed for now
      status_code: number;
      rules: Array<{
        rule_id: RuleSignatureId;
        name?: string;
      }>;
    }>;
  }
}
```

Implementation: not implemented in this POC.

## API performance considerations

```txt
GET /internal/detection_engine/prebuilt_rules/status
```

Should be fast and lightweight (< 1 second). Should:

- have O(1) complexity
- require as few requests to ES as possible
- not load a lot of data into memory
- not do heavy in-memory calculations

```txt
POST /internal/detection_engine/prebuilt_rules/*/_review
```

Could be slightly slow (1 to 5 seconds). Can:

- have O(n + k) complexity, where n is installed, k is known prebuilt rules (NOT historical versions)
- do some requests to ES, but not N+1
- load a lot of data into memory
- do heavy in-memory calculations

```txt
POST /internal/detection_engine/prebuilt_rules/*/_perform
```

Could be moderately slow (< 1 minute). Can:

- have O(n + k) complexity, where n is installed, k is known prebuilt rules (NOT historical versions)
- do N+1 requests to ES
- load a lot of data into memory
- do heavy in-memory calculations

## API testing

All the 3 added endpoints accept a `data_model` parameter so we could test their work and performance
in different conditions and with different data models.

1. Generate test prebuilt rule assets (the endpoint will do it for all 3 data models).
    Pick whatever number of versions you want to be generated per each rule.

    ```txt
    POST /internal/detection_engine/prebuilt_rules/_install_test_assets
    {
      "num_versions_per_rule": 10
    }
    ```

2. Test get status endpoint

    ```txt
    GET /internal/detection_engine/prebuilt_rules/status?data_model=flat

    GET /internal/detection_engine/prebuilt_rules/status?data_model=composite

    GET /internal/detection_engine/prebuilt_rules/status?data_model=composite2
    ```

3. Test review installation endpoint

    ```txt
    POST /internal/detection_engine/prebuilt_rules/installation/_review
    {
      "data_model": "flat"
    }

    POST /internal/detection_engine/prebuilt_rules/installation/_review
    {
      "data_model": "composite"
    }

    POST /internal/detection_engine/prebuilt_rules/installation/_review
    {
      "data_model": "composite2"
    }
    ```

4. Test review upgrade endpoint

    ```txt
    POST /internal/detection_engine/prebuilt_rules/upgrade/_review
    {
      "data_model": "flat"
    }

    POST /internal/detection_engine/prebuilt_rules/upgrade/_review
    {
      "data_model": "composite"
    }

    POST /internal/detection_engine/prebuilt_rules/upgrade/_review
    {
      "data_model": "composite2"
    }
    ```

## Rule fields

I did some research on rule fields to be able to determine which rule fields will be "customizable" and which will be "technical".

Please find the result and follow-up work to do in a dedicated ticket:

https://github.com/elastic/kibana/issues/147239

## Diff algorithm

This section describes an algorithm that returns a 3-way diff between 3 rule versions: base, current, target.

### Definition: diffable rule

We have two data structures that represent a prebuilt rule:

- `PrebuiltRuleToInstall`: schema for a prebuilt rule asset (filesystem or fleet package based).
- `RuleResponse`: schema for an Alerting Framework's rule.

These data structures are similar but different. In order to be able to run a diff between
an already installed prebuilt rule (`RuleResponse`) and its next version shipped by Elastic
(`PrebuiltRuleToInstall`) we would first need to normalize both of them to a common interface
that would be suitable for passing to the diff algorithm. This common interface is `DiffableRule`.

`common/detection_engine/prebuilt_rules/poc/diffable_rule_model/diffable_rule.ts`:

<details>

```ts
export type DiffableCommonFields = t.TypeOf<typeof DiffableCommonFields>;
export const DiffableCommonFields = buildSchema({
  required: {
    // Technical fields
    // NOTE: We might consider removing them from the schema and returning from the API
    // not via the fields diff, but via dedicated properties in the response body.
    rule_id: RuleSignatureId,
    rule_content_version: SemanticVersion,
    stack_version_min: SemanticVersion,
    stack_version_max: SemanticVersion,
    meta: RuleMetadata,

    // Main domain fields
    name: RuleName,
    tags: RuleTagArray,
    description: RuleDescription,
    severity: Severity,
    severity_mapping: SeverityMapping,
    risk_score: RiskScore,
    risk_score_mapping: RiskScoreMapping,

    // About -> Advanced settings
    references: RuleReferenceArray,
    false_positives: RuleFalsePositiveArray,
    threat: ThreatArray,
    note: InvestigationGuide,
    setup: SetupGuide,
    related_integrations: RelatedIntegrationArray,
    required_fields: RequiredFieldArray,
    author: RuleAuthorArray,
    license: RuleLicense,

    // Other domain fields
    rule_schedule: RuleSchedule, // NOTE: new field
    actions: RuleActionArray,
    throttle: RuleActionThrottle,
    exceptions_list: ExceptionListArray,
    max_signals: MaxSignals,
  },
  optional: {
    rule_name_override: RuleNameOverrideObject, // NOTE: new field
    timestamp_override: TimestampOverrideObject, // NOTE: new field
    timeline_template: TimelineTemplateReference, // NOTE: new field
    building_block: BuildingBlockObject, // NOTE: new field
  },
});

export type DiffableCustomQueryFields = t.TypeOf<typeof DiffableCustomQueryFields>;
export const DiffableCustomQueryFields = buildSchema({
  required: {
    type: t.literal('query'),
    data_query: RuleKqlQuery, // NOTE: new field
  },
  optional: {
    data_source: RuleDataSource, // NOTE: new field
    alert_suppression: AlertSuppression,
  },
});

export type DiffableSavedQueryFields = t.TypeOf<typeof DiffableSavedQueryFields>;
export const DiffableSavedQueryFields = buildSchema({
  required: {
    type: t.literal('saved_query'),
    data_query: RuleKqlQuery, // NOTE: new field
  },
  optional: {
    data_source: RuleDataSource, // NOTE: new field
    alert_suppression: AlertSuppression,
  },
});

export type DiffableEqlFields = t.TypeOf<typeof DiffableEqlFields>;
export const DiffableEqlFields = buildSchema({
  required: {
    type: t.literal('eql'),
    data_query: RuleEqlQuery, // NOTE: new field
  },
  optional: {
    data_source: RuleDataSource, // NOTE: new field
    event_category_override: EventCategoryOverride,
    timestamp_field: TimestampField,
    tiebreaker_field: TiebreakerField,
  },
});

export type DiffableThreatMatchFields = t.TypeOf<typeof DiffableThreatMatchFields>;
export const DiffableThreatMatchFields = buildSchema({
  required: {
    type: t.literal('threat_match'),
    data_query: RuleKqlQuery, // NOTE: new field
    threat_query: InlineKqlQuery, // NOTE: new field
    threat_index,
    threat_mapping,
  },
  optional: {
    data_source: RuleDataSource, // NOTE: new field
    threat_indicator_path,
    concurrent_searches, // Should combine concurrent_searches and items_per_search?
    items_per_search,
  },
});

export type DiffableThresholdFields = t.TypeOf<typeof DiffableThresholdFields>;
export const DiffableThresholdFields = buildSchema({
  required: {
    type: t.literal('threshold'),
    data_query: RuleKqlQuery, // NOTE: new field
    threshold: Threshold,
  },
  optional: {
    data_source: RuleDataSource, // NOTE: new field
  },
});

export type DiffableMachineLearningFields = t.TypeOf<typeof DiffableMachineLearningFields>;
export const DiffableMachineLearningFields = buildSchema({
  required: {
    type: t.literal('machine_learning'),
    machine_learning_job_id,
    anomaly_threshold,
  },
  optional: {},
});

export type DiffableNewTermsFields = t.TypeOf<typeof DiffableNewTermsFields>;
export const DiffableNewTermsFields = buildSchema({
  required: {
    type: t.literal('new_terms'),
    data_query: InlineKqlQuery, // NOTE: new field
    new_terms_fields: NewTermsFields,
    history_window_start: HistoryWindowStart,
  },
  optional: {
    data_source: RuleDataSource, // NOTE: new field
  },
});

/**
 * Represents a normalized rule object that is suitable for passing to the diff algorithm.
 * Every top-level field of a diffable rule can be compared separately on its own.
 *
 * It's important to do such normalization because:
 *
 * 1. We need to compare installed rules with prebuilt rule content. These objects have similar but not exactly
 * the same interfaces. In order to compare them we need to convert them to a common interface.
 *
 * 2. It only makes sense to compare certain rule fields in combination with other fields. For example,
 * we combine `index` and `data_view_id` fields into a `RuleDataSource` object, so that later we could
 * calculate a diff for this whole object. If we don't combine them the app would successfully merge the
 * following values independently from each other without a conflict:
 *
 *   Base version: index=[logs-*], data_view_id=undefined
 *   Current version: index=[], data_view_id=some-data-view // user switched to a data view
 *   Target version: index=[logs-*, filebeat-*], data_view_id=undefined // Elastic added a new index pattern
 *   Merged version: index=[filebeat-*], data_view_id=some-data-view ???
 *
 * Instead, semantically such change represents a conflict because the data source of the rule was changed
 * in a potentially incompatible way, and the user might want to review the change and resolve it manually.
 * The user must either pick index patterns or a data view, but not both at the same time.
 *
 * NOTE: Every top-level field in a DiffableRule MUST BE LOGICALLY INDEPENDENT from other
 * top-level fields.
 */
export type DiffableRule = t.TypeOf<typeof DiffableRule>;
export const DiffableRule = t.intersection([
  DiffableCommonFields,
  t.union([
    DiffableCustomQueryFields,
    DiffableSavedQueryFields,
    DiffableEqlFields,
    DiffableThreatMatchFields,
    DiffableThresholdFields,
    DiffableMachineLearningFields,
    DiffableNewTermsFields,
  ]),
]);
```

</details>

### Definition: 3-way diff

We will use a 3-way diff algorithm for two things:

- Calculating a 3-way diff result for every "diffable" rule field (every top-level field of a `DiffableRule`).
- Calculating a 3-way diff result for the whole rule serialized into JSON

In order to calculate a 3-way diff result for a field, we will need 3 input values:

- The base version of the field.
- The current version of the field.
- The target version of the field.

And, our goal will be:

- to try to automatically merge these 3 versions into a 4th one that could be accepted or rejected by the user
- to flag about a merge conflict when these 3 versions can't be automatically merged

Potential reasons for a conflict:

- the 3 versions can't be technically merged unambiguously
- it's possible to merge it technically but it wouldn't be safe: it would bring a risk of breaking the
  rule's behavior or introducing unintended side-effects in the behavior from the user's point of view

Below is a `ThreeWayDiff` result's interface.

`common/detection_engine/prebuilt_rules/poc/diff_model/three_way_diff.ts`:

<details>

```ts
/**
 * Three versions of a value to pass to a diff algorithm.
 */
export interface ThreeVersionsOf<TValue> {
  /**
   * Corresponds to the stock version of the currently installed prebuilt rule.
   */
  base_version: TValue;

  /**
   * Corresponds exactly to the currently installed prebuilt rule:
   *   - to the customized version (if it's customized)
   *   - to the stock version (if it's not customized)
   */
  current_version: TValue;

  /**
   * Corresponds to the "new" stock version that the user is trying to upgrade to.
   */
  target_version: TValue;
}

/**
 * Represents a result of an abstract three-way diff/merge operation on a value
 * (could be a whole rule JSON or a given rule field).
 *
 * Typical situations:
 *
 * 1. base=A, current=A, target=A => merged=A, conflict=false
 *    Stock rule, the value hasn't changed.
 *
 * 2. base=A, current=A, target=B => merged=B, conflict=false
 *    Stock rule, the value has changed.
 *
 * 3. base=A, current=B, target=A => merged=B, conflict=false
 *    Customized rule, the value hasn't changed.
 *
 * 4. base=A, current=B, target=B => merged=B, conflict=false
 *    Customized rule, the value has changed exactly the same way as in the user customization.
 *
 * 5. base=A, current=B, target=C => merged=D, conflict=false
 *    Customized rule, the value has changed, conflict between B and C resolved automatically.
 *
 * 6. base=A, current=B, target=C => merged=C, conflict=true
 *    Customized rule, the value has changed, conflict between B and C couldn't be resolved automatically.
 */
export interface ThreeWayDiff<TValue> extends ThreeVersionsOf<TValue> {
  /**
   * The result of an automatic three-way merge of three values:
   *   - base version
   *   - current version
   *   - target version
   *
   * Exact merge algorithm depends on the value:
   *   - one algo could be used for single-line strings and keywords (e.g. rule name)
   *   - another one could be used for multiline text (e.g. rule description)
   *   - another one could be used for arrays of keywords (e.g. rule tags)
   *   - another one could be used for the MITRE ATT&CK data structure
   *   - etc
   *
   * Merged version always has a value. We do our best to resolve conflicts automatically.
   * If they can't be resolved automatically, merged version is equal to target version.
   */
  merged_version: TValue;

  /**
   * Tells which combination corresponds to the three input versions of the value for this specific diff.
   */
  diff_outcome: ThreeWayDiffOutcome;

  /**
   * The type of result of an automatic three-way merge of three values:
   *   - base version
   *   - current version
   *   - target version
   */
  merge_outcome: ThreeWayMergeOutcome;

  /**
   * Tells if the value has changed in the target version and the current version could be updated.
   * True if:
   *   - base=A, current=A, target=B
   *   - base=A, current=B, target=C
   */
  has_value_changed: boolean;

  /**
   * True if:
   *   - current != target and we couldn't automatically resolve the conflict between them
   *
   * False if:
   *   - current == target (value won't change)
   *   - current != target && current == base (stock rule will get a new value)
   *   - current != target and we automatically resolved the conflict between them
   */
  has_conflict: boolean;
}

/**
 * Given the three versions of a value, calculates a three-way diff for it.
 */
export type ThreeWayDiffAlgorithm<TValue> = (
  versions: ThreeVersionsOf<TValue>
) => ThreeWayDiff<TValue>;

/**
 * Result of comparing three versions of a value against each other.
 * Defines 5 typical combinations of 3 versions of a value.
 */
export enum ThreeWayDiffOutcome {
  /** Stock rule, the value hasn't changed in the target version. */
  StockValueNoUpdate = 'BASE=A, CURRENT=A, TARGET=A',

  /** Stock rule, the value has changed in the target version. */
  StockValueCanUpdate = 'BASE=A, CURRENT=A, TARGET=B',

  /** Customized rule, the value hasn't changed in the target version comparing to the base one. */
  CustomizedValueNoUpdate = 'BASE=A, CURRENT=B, TARGET=A',

  /** Customized rule, the value has changed in the target version exactly the same way as in the user customization. */
  CustomizedValueSameUpdate = 'BASE=A, CURRENT=B, TARGET=B',

  /** Customized rule, the value has changed in the target version and is not equal to the current version. */
  CustomizedValueCanUpdate = 'BASE=A, CURRENT=B, TARGET=C',
}

/**
 * Type of result of an automatic three-way merge of three values:
 *   - base version
 *   - current version
 *   - target version
 */
export enum ThreeWayMergeOutcome {
  /** Took current version and returned as the merged one. */
  Current = 'CURRENT',

  /** Took target version and returned as the merged one. */
  Target = 'TARGET',

  /** Merged three versions successfully into a new one. */
  Merged = 'MERGED',

  /** Merged three versions with a conflict. */
  MergedWithConflict = 'MERGED_WITH_CONFLICT',
}
```

</details>

### The algorithm itself

GIVEN a list of prebuilt rules that can be upgraded (`currentVersion[]`)
AND a list of the corresponding base asset saved objects (`baseVersion[]`)
AND a list of the corresponding target asset saved objects (`targetVersion[]`)
DO run the diff algorithm for every match of these 3 versions.

`common/detection_engine/prebuilt_rules/poc/diff_algorithm/calculate_rule_diff.ts`:

<details>

```ts
export interface CalculateRuleDiffArgs {
  currentVersion: RuleResponse;
  baseVersion: PrebuiltRuleContent;
  targetVersion: PrebuiltRuleContent;
}

export interface CalculateRuleDiffResult {
  ruleDiff: RuleDiff;
  ruleVersions: {
    input: {
      current: RuleResponse;
      base: PrebuiltRuleContent;
      target: PrebuiltRuleContent;
    };
    output: {
      current: DiffableRule;
      base: DiffableRule;
      target: DiffableRule;
    };
  };
}

/**
 * Calculates a rule diff for a given set of 3 versions of the rule:
 *   - currenly installed version
 *   - base version that is the corresponding stock rule content
 *   - target version which is the stock rule content the user wants to update the rule to
 */
export const calculateRuleDiff = (args: CalculateRuleDiffArgs): CalculateRuleDiffResult => {
  /*
    1. Convert current, base and target versions to `DiffableRule`.
    2. Calculate a `RuleFieldsDiff`. For every top-level field of `DiffableRule`:
      2.1. Pick a code path based on the rule type.
      2.2. Pick a concrete diff algorithm (function) per rule field based on the field name or type.
        - one algo for rule name and other simple string fields
        - another one for tags and other arrays of keywords
        - another one for multiline text fields (investigation guide, setup guide, etc)
        - another one for `data_source`
        - etc
      2.3. Call the picked diff function to get a `ThreeWayDiff` result
      2.4. Add the result to the `RuleFieldsDiff` object as a key-value pair "fieldName: ThreeWayDiff".
    3. Calculate a `RuleJsonDiff` for the whole rule based on the `RuleFieldsDiff` from the previous step.
    4. Return the `RuleFieldsDiff` and `RuleJsonDiff` objects.
  */

  const { baseVersion, currentVersion, targetVersion } = args;

  const diffableBaseVersion = convertRuleToDiffable(baseVersion);
  const diffableCurrentVersion = convertRuleToDiffable(currentVersion);
  const diffableTargetVersion = convertRuleToDiffable(targetVersion);

  const fieldsDiff = calculateRuleFieldsDiff({
    base_version: diffableBaseVersion,
    current_version: diffableCurrentVersion,
    target_version: diffableTargetVersion,
  });

  // I'm thinking that maybe instead of eagerly calculating it for many rules on the BE side we should
  // calculate it on the FE side on demand, only if the user switches to the corresponding view.
  const jsonDiff = calculateRuleJsonDiff(fieldsDiff);

  return {
    ruleDiff: combineDiffs(fieldsDiff, jsonDiff),
    ruleVersions: {
      input: {
        current: currentVersion,
        base: baseVersion,
        target: targetVersion,
      },
      output: {
        current: diffableCurrentVersion,
        base: diffableBaseVersion,
        target: diffableTargetVersion,
      },
    },
  };
};

const combineDiffs = (fieldsDiff: RuleFieldsDiff, jsonDiff: RuleJsonDiff): RuleDiff => {
  const hasFieldsConflict = Object.values<ThreeWayDiff<unknown>>(fieldsDiff).some(
    (fieldDiff) => fieldDiff.has_conflict
  );

  const hasJsonConflict = jsonDiff.has_conflict;

  return {
    fields: fieldsDiff,
    json: jsonDiff,
    has_conflict: hasFieldsConflict || hasJsonConflict,
  };
};
```

</details>

The algorithm's overall structure is fully implemented and works, but it uses a simple diff algorithm
for calculating field diffs. This algorithm is kinda nasty: it doesn't try to merge any values
and marks a diff as conflict if base version != current version != target version.

`common/detection_engine/prebuilt_rules/poc/diff_algorithm/calculation/algorithms/simple_diff_algorithm.ts`.

The idea is to write more flexible algorithms for different rule fields that would generate fewer
conflicts and would try to automatically merge changes when it can be technically done and it won't
result in inintended changes in the rule from the user standpoint.
