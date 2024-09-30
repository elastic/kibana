/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SplunkRule } from '../../../../../../../../common/api/siem_migrations/splunk/rules/splunk_rule.gen';
import { fetchRuleVersionsTriad } from '../../../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import { createPrebuiltRuleObjectsClient } from '../../../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleAssetsClient } from '../../../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { PrebuiltRulesMapByName } from '../../types';

interface RetrievePrebuiltRulesParams {
  soClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
  splunkRule: SplunkRule;
}

export const retrievePrebuiltRulesMap = async ({
  soClient,
  rulesClient,
  splunkRule,
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
        isInstalled: !!ruleVersions.current,
        rule,
      });
    }
  });

  if (splunkRule.mitreAttackIds?.length) {
    // If this rule has MITRE ATT&CK IDs, remove unrelated prebuilt rules
    prebuiltRulesByName.forEach(({ rule }, ruleName) => {
      const mitreAttackThreat = rule.threat?.filter(
        ({ framework }) => framework === 'MITRE ATT&CK'
      );
      if (!mitreAttackThreat) {
        // If this rule has no MITRE ATT&CK reference we can not ensure it is not related to the rule, keep it
        return;
      }

      const sameTechnique = mitreAttackThreat.find((threat) =>
        threat.technique?.some(({ id }) => splunkRule.mitreAttackIds?.includes(id))
      );

      if (!sameTechnique) {
        prebuiltRulesByName.delete(ruleName);
      }
    });
  }

  return prebuiltRulesByName;
};
