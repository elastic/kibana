/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DiffableRule,
  FullRuleDiff,
  ThreeWayDiff,
  RuleFieldsDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  MissingVersion,
  ThreeWayDiffConflict,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { convertRuleToDiffable } from '../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';

import { calculateRuleFieldsDiff } from './calculation/calculate_rule_fields_diff';

export interface RuleVersions {
  current?: RuleResponse;
  base?: PrebuiltRuleAsset;
  target?: PrebuiltRuleAsset;
}

export interface CalculateRuleDiffResult {
  ruleDiff: FullRuleDiff;
  ruleVersions: {
    input: RuleVersions;
    output: {
      current: DiffableRule;
      base?: DiffableRule;
      target: DiffableRule;
    };
  };
}

/**
 * Calculates a rule diff for a given set of 3 versions of the rule:
 *   - currently installed version
 *   - base version that is the corresponding stock rule content
 *   - target version which is the stock rule content the user wants to update the rule to
 */
export const calculateRuleDiff = (args: RuleVersions): CalculateRuleDiffResult => {
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
    3. Create and return a result based on the `RuleFieldsDiff`.
  */

  const { base, current, target } = args;

  invariant(current != null, 'current version is required');
  const diffableCurrentVersion = convertRuleToDiffable(
    convertPrebuiltRuleAssetToRuleResponse(current)
  );

  invariant(target != null, 'target version is required');
  const diffableTargetVersion = convertRuleToDiffable(
    convertPrebuiltRuleAssetToRuleResponse(target)
  );

  // Base version is optional
  const diffableBaseVersion = base
    ? convertRuleToDiffable(convertPrebuiltRuleAssetToRuleResponse(base))
    : undefined;

  const fieldsDiff = calculateRuleFieldsDiff({
    base_version: diffableBaseVersion || MissingVersion,
    current_version: diffableCurrentVersion,
    target_version: diffableTargetVersion,
  });

  const {
    numberFieldsWithUpdates,
    numberFieldsWithConflicts,
    numberFieldsWithNonSolvableConflicts,
  } = getNumberOfFieldsByChangeType(fieldsDiff);

  return {
    ruleDiff: {
      fields: fieldsDiff,
      num_fields_with_updates: numberFieldsWithUpdates,
      num_fields_with_conflicts: numberFieldsWithConflicts,
      num_fields_with_non_solvable_conflicts: numberFieldsWithNonSolvableConflicts,
    },
    ruleVersions: {
      input: {
        current,
        base,
        target,
      },
      output: {
        current: diffableCurrentVersion,
        base: diffableBaseVersion,
        target: diffableTargetVersion,
      },
    },
  };
};

const getNumberOfFieldsByChangeType = (fieldsDiff: RuleFieldsDiff) =>
  Object.values<ThreeWayDiff<unknown>>(fieldsDiff).reduce<{
    numberFieldsWithUpdates: number;
    numberFieldsWithConflicts: number;
    numberFieldsWithNonSolvableConflicts: number;
  }>(
    (counts, fieldDiff) => {
      if (fieldDiff.has_update) {
        counts.numberFieldsWithUpdates += 1;
      }

      if (fieldDiff.conflict !== ThreeWayDiffConflict.NONE) {
        counts.numberFieldsWithConflicts += 1;

        if (fieldDiff.conflict === ThreeWayDiffConflict.NON_SOLVABLE) {
          counts.numberFieldsWithNonSolvableConflicts += 1;
        }
      }

      return counts;
    },
    {
      numberFieldsWithUpdates: 0,
      numberFieldsWithConflicts: 0,
      numberFieldsWithNonSolvableConflicts: 0,
    }
  );
