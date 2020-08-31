/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { RuleAlertType } from './types';

export const getRulesToUpdate = (
  rulesFromFileSystem: AddPrepackagedRulesSchemaDecoded[],
  installedRules: RuleAlertType[]
): AddPrepackagedRulesSchemaDecoded[] => {
  return rulesFromFileSystem.filter((rule) =>
    installedRules.some((installedRule) => {
      return (
        rule.rule_id === installedRule.params.ruleId && rule.version > installedRule.params.version
      );
    })
  );
};
