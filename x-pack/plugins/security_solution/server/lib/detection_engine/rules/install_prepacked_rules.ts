/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { AddPrepackagedRulesSchema } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { createRules } from './create_rules';

export const installPrepackagedRules = (
  rulesClient: RulesClient,
  rules: AddPrepackagedRulesSchema[]
): Array<Promise<SanitizedRule<RuleTypeParams>>> =>
  rules.reduce<Array<Promise<SanitizedRule<RuleTypeParams>>>>((acc, rule) => {
    return [
      ...acc,
      createRules({
        rulesClient,
        params: rule,
      }),
    ];
  }, []);
