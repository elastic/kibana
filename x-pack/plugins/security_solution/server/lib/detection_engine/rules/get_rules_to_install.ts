/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { RuleAlertType } from './types';

export const getRulesToInstall = (
  rulesFromFileSystem: AddPrepackagedRulesSchemaDecoded[],
  installedRules: RuleAlertType[]
) => {
  return rulesFromFileSystem.filter(
    (rule) => !installedRules.some((installedRule) => installedRule.params.ruleId === rule.rule_id)
  );
};
