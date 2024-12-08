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
import type { RuleMigration } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

export const getUniquePrebuiltRuleIds = (migrationRules: RuleMigration[]): string[] => {
  const rulesIds = new Set<string>();
  migrationRules.forEach((rule) => {
    if (rule.elastic_rule?.prebuilt_rule_id) {
      rulesIds.add(rule.elastic_rule.prebuilt_rule_id);
    }
  });
  return Array.from(rulesIds);
};

export interface PrebuiltRulesResults {
  /**
   * The latest available version
   */
  target: RuleResponse;

  /**
   * The currently installed version
   */
  current?: RuleResponse;
}

/**
 * Gets Elastic prebuilt rules
 * @param rulesClient The rules client to fetch prebuilt rules
 * @param savedObjectsClient The saved objects client
 * @param rulesIds The list of IDs to filter requested prebuilt rules. If not specified, all available prebuilt rules will be returned.
 * @returns
 */
export const getPrebuiltRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  rulesIds?: string[]
): Promise<Record<string, PrebuiltRulesResults>> => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

  const prebuiltRulesMap = await fetchRuleVersionsTriad({
    ruleAssetsClient,
    ruleObjectsClient,
  });

  // Filter out prebuilt rules by `rule_id`
  let filteredPrebuiltRulesMap: typeof prebuiltRulesMap;
  if (rulesIds) {
    filteredPrebuiltRulesMap = new Map();
    for (const ruleId of rulesIds) {
      const prebuiltRule = prebuiltRulesMap.get(ruleId);
      if (prebuiltRule) {
        filteredPrebuiltRulesMap.set(ruleId, prebuiltRule);
      }
    }
  } else {
    filteredPrebuiltRulesMap = prebuiltRulesMap;
  }

  const prebuiltRules: Record<string, PrebuiltRulesResults> = {};
  filteredPrebuiltRulesMap.forEach((ruleVersions, ruleId) => {
    if (ruleVersions.target) {
      prebuiltRules[ruleId] = {
        target: convertPrebuiltRuleAssetToRuleResponse(ruleVersions.target),
        current: ruleVersions.current,
      };
    }
  });

  return prebuiltRules;
};
