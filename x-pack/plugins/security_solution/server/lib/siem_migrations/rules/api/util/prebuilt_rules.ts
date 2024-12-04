/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { createPrebuiltRuleObjectsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { fetchRuleVersionsTriad } from '../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import { createPrebuiltRuleAssetsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../../detection_engine/rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';

interface PrebuiltRulesResults {
  /**
   * The latest available version
   */
  target: RuleResponse;

  /**
   * The currently installed version
   */
  current?: RuleResponse;
}

export const getPrebuiltRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rulesIds?: string[]
): Promise<PrebuiltRulesResults[]> => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

  const prebuiltRulesMap = await fetchRuleVersionsTriad({
    ruleAssetsClient,
    ruleObjectsClient,
  });

  // Filter out prebuilt rules by `rule_id`
  if (rulesIds) {
    for (const ruleId of prebuiltRulesMap.keys()) {
      if (!rulesIds.includes(ruleId)) {
        prebuiltRulesMap.delete(ruleId);
      }
    }
  }

  const prebuiltRules: PrebuiltRulesResults[] = [];
  prebuiltRulesMap.forEach((ruleVersions, ruleId) => {
    if (ruleVersions.target) {
      prebuiltRules.push({
        target: convertPrebuiltRuleAssetToRuleResponse(ruleVersions.target),
        current: ruleVersions.current,
      });
    }
  });

  return prebuiltRules;
};
