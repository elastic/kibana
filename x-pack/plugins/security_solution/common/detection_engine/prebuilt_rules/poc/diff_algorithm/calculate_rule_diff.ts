/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../rule_schema';
import type { PrebuiltRuleContent } from '../content_model/prebuilt_rule_content';
import type { RuleDiff, RuleFieldsDiff, RuleJsonDiff } from '../diff_model/rule_diff';
import type { ThreeWayDiff } from '../diff_model/three_way_diff';
import type { DiffableRule } from '../diffable_rule_model/diffable_rule';

import { convertRuleToDiffable } from './normalization/convert_rule_to_diffable';
import { calculateRuleFieldsDiff } from './calculation/calculate_rule_fields_diff';
import { calculateRuleJsonDiff } from './calculation/calculate_rule_json_diff';

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
