/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddPrepackagedRulesSchema } from '../../../../common/detection_engine/schemas/request/rule_schemas';
import { RuleAlertType } from './types';

export const getRulesToInstall = (
  rulesFromFileSystem: AddPrepackagedRulesSchema[],
  installedRules: RuleAlertType[]
) => {
  return rulesFromFileSystem.filter(
    (rule) => !installedRules.some((installedRule) => installedRule.params.ruleId === rule.rule_id)
  );
};
