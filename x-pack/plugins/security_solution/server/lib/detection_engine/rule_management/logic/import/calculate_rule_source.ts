/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSource, RuleToImport } from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';

/**
 * Calculates the rule_source field for a rule being imported
 *
 * @param rule The rule to be imported
 * @param prebuiltRuleAssets A list of prebuilt rule assets, which may include
 * the installed version of the specified prebuilt rule.
 */
export const calculateRuleSource = ({
  rule,
  prebuiltRuleAssets,
}: {
  rule: RuleToImport;
  prebuiltRuleAssets: PrebuiltRuleAsset[];
}): RuleSource => {};
