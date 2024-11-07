/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PrebuiltRuleAsset } from '../../../../detection_engine/prebuilt_rules';
import { fetchRuleVersionsTriad } from '../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import { createPrebuiltRuleObjectsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleAssetsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';

export interface PrebuiltRuleMapped {
  rule: PrebuiltRuleAsset;
  installedRuleId?: string;
}

export type PrebuiltRulesMapByName = Map<string, PrebuiltRuleMapped>;

interface RetrievePrebuiltRulesParams {
  soClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
}

export const retrievePrebuiltRulesMap = async ({
  soClient,
  rulesClient,
}: RetrievePrebuiltRulesParams): Promise<PrebuiltRulesMapByName> => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
  const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

  const prebuiltRulesMap = await fetchRuleVersionsTriad({
    ruleAssetsClient,
    ruleObjectsClient,
  });
  const prebuiltRulesByName: PrebuiltRulesMapByName = new Map();
  prebuiltRulesMap.forEach((ruleVersions) => {
    const rule = ruleVersions.target || ruleVersions.current;
    if (rule) {
      prebuiltRulesByName.set(rule.name, {
        rule,
        installedRuleId: ruleVersions.current?.id,
      });
    }
  });
  return prebuiltRulesByName;
};

export const filterPrebuiltRules = (
  prebuiltRulesByName: PrebuiltRulesMapByName,
  mitreAttackIds: string[]
) => {
  const filteredPrebuiltRulesByName = new Map();
  if (mitreAttackIds?.length) {
    // If this rule has MITRE ATT&CK IDs, remove unrelated prebuilt rules
    prebuiltRulesByName.forEach(({ rule }, ruleName) => {
      const mitreAttackThreat = rule.threat?.filter(
        ({ framework }) => framework === 'MITRE ATT&CK'
      );
      if (!mitreAttackThreat) {
        // If this rule has no MITRE ATT&CK reference we skip it
        return;
      }

      const sameTechnique = mitreAttackThreat.find((threat) =>
        threat.technique?.some(({ id }) => mitreAttackIds?.includes(id))
      );

      if (sameTechnique) {
        filteredPrebuiltRulesByName.set(ruleName, prebuiltRulesByName.get(ruleName));
      }
    });
  }
  return filteredPrebuiltRulesByName;
};
