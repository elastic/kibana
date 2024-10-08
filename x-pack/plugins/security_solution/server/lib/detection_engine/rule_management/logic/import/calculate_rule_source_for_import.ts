/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleSource,
  ValidatedRuleToImport,
} from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import { convertPrebuiltRuleAssetToRuleResponse } from '../detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { calculateRuleSourceFromAsset } from './calculate_rule_source_from_asset';

/**
 * Calculates the rule_source field for a rule being imported
 *
 * @param rule The rule to be imported
 * @param prebuiltRuleAssets A list of prebuilt rule assets, which may include
 * the installed version of the specified prebuilt rule.
 * @param ruleIdExists {boolean} Whether the rule's rule_id is available as a
 * prebuilt asset (independent of the specified version).
 *
 * @returns The calculated rule_source and immutable fields for the rule
 */
export const calculateRuleSourceForImport = ({
  rule,
  prebuiltRuleAssetsByRuleId,
  ruleIdExists,
}: {
  rule: ValidatedRuleToImport;
  prebuiltRuleAssetsByRuleId: Record<string, PrebuiltRuleAsset>;
  ruleIdExists: boolean;
}): { ruleSource: RuleSource; immutable: boolean } => {
  const assetWithMatchingVersion = prebuiltRuleAssetsByRuleId[rule.rule_id];
  // We convert here so that RuleSource calculation can
  // continue to deal only with RuleResponses. The fields missing from the
  // incoming rule are not actually needed for the calculation, but only to
  // satisfy the type system.
  const ruleResponseForImport = convertPrebuiltRuleAssetToRuleResponse(rule);
  const ruleSource = calculateRuleSourceFromAsset({
    rule: ruleResponseForImport,
    assetWithMatchingVersion,
    ruleIdExists,
  });

  return {
    ruleSource,
    immutable: ruleSource.type === 'external',
  };
};
