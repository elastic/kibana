/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PrebuiltRuleToImport,
  RuleSource,
} from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import { calculateRuleSourceFromAsset } from '../detection_rules_client/mergers/rule_source/calculate_rule_source_from_asset';

/**
 * Calculates the rule_source field for a rule being imported
 *
 * @param rule The rule to be imported
 * @param prebuiltRuleAssets A list of prebuilt rule assets, which may include
 * the installed version of the specified prebuilt rule.
 * @param installedRuleIds A list of prebuilt rule IDs that are currently installed
 */
export const calculateRuleSourceForImport = ({
  rule,
  prebuiltRuleAssets,
  installedRuleIds,
}: {
  rule: PrebuiltRuleToImport;
  prebuiltRuleAssets: PrebuiltRuleAsset[];
  installedRuleIds: string[];
}): RuleSource => {
  const matchingAsset = prebuiltRuleAssets.find((asset) => asset.rule_id === rule.rule_id);
  const ruleIdExists = installedRuleIds.includes(rule.rule_id);

  return calculateRuleSourceFromAsset({
    rule,
    prebuiltRuleAsset: matchingAsset,
    ruleIdExists,
  });
};
