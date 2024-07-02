/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleResponse,
  RuleSource,
} from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import type { IPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { calculateIsCustomized } from './calculate_is_customized';

interface CalculateRuleSourceProps {
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  existingRule: RuleResponse;
  nextRule: RuleResponse;
}

export async function calculateRuleSource({
  prebuiltRuleAssetClient,
  existingRule,
  nextRule,
}: CalculateRuleSourceProps): Promise<RuleSource> {
  if (existingRule.immutable) {
    // This is a prebuilt rule and, despite the name, they are not immutable. So
    // we need to recalculate `ruleSource.isCustomized` based on the rule's contents.
    const prebuiltRulesResponse = await prebuiltRuleAssetClient.fetchAssetsByVersion([
      {
        rule_id: existingRule.rule_id,
        version: existingRule.version,
      },
    ]);
    const baseRule: PrebuiltRuleAsset | undefined = prebuiltRulesResponse.at(0);

    const isCustomized = calculateIsCustomized(baseRule, nextRule);

    return {
      type: 'external',
      is_customized: isCustomized,
    };
  }

  return {
    type: 'internal',
  };
}
