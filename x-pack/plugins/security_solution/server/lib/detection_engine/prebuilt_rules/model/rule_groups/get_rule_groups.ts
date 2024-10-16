/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleVersions } from '../../logic/diff/calculate_rule_diff';
import type { PrebuiltRuleAsset } from '../rule_assets/prebuilt_rule_asset';

export interface RuleTriad {
  /**
   * The base version of the rule (no customizations)
   */
  base?: PrebuiltRuleAsset;
  /**
   * The currently installed version
   */
  current: RuleResponse;
  /**
   * The latest available version
   */
  target: PrebuiltRuleAsset;
}
export interface RuleGroups {
  /**
   * Rules that are currently installed in Kibana
   */
  currentRules: RuleResponse[];
  /**
   * Rules that are ready to be installed
   */
  installableRules: PrebuiltRuleAsset[];
  /**
   * Rules that are installed but outdated
   */
  upgradeableRules: RuleTriad[];
  /**
   * All available rules
   * (installed and not installed)
   */
  totalAvailableRules: PrebuiltRuleAsset[];
}

export const getRuleGroups = (ruleVersionsMap: Map<string, RuleVersions>): RuleGroups => {
  const currentRules: RuleResponse[] = [];
  const installableRules: PrebuiltRuleAsset[] = [];
  const totalAvailableRules: PrebuiltRuleAsset[] = [];
  const upgradeableRules: RuleGroups['upgradeableRules'] = [];

  ruleVersionsMap.forEach(({ base, current, target }) => {
    if (target != null) {
      // If this rule is available in the package
      totalAvailableRules.push(target);
    }

    if (current != null) {
      // If this rule is installed
      currentRules.push(current);
    }

    if (current == null && target != null) {
      // If this rule is not installed
      installableRules.push(target);
    }

    if (current != null && target != null && current.version < target.version) {
      // If this rule is installed but outdated
      upgradeableRules.push({
        base,
        current,
        target,
      });
    }
  });

  return {
    currentRules,
    installableRules,
    upgradeableRules,
    totalAvailableRules,
  };
};
