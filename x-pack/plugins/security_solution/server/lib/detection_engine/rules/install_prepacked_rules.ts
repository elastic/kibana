/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { AddPrepackagedRulesSchema } from '../../../../common/detection_engine/schemas/request/rule_schemas';
import { convertCreateAPIToInternalSchema } from '../schemas/rule_converters';
import { AppClient } from '../../../types';
import { InternalRuleCreate } from '../schemas/rule_schemas';

export const installPrepackagedRules = (
  rulesClient: RulesClient,
  rules: AddPrepackagedRulesSchema[],
  siemClient: AppClient
): Array<Promise<SanitizedRule<RuleTypeParams>>> =>
  rules.reduce<Array<Promise<SanitizedRule<RuleTypeParams>>>>((acc, rule) => {
    const internalRuleCreate: InternalRuleCreate = convertCreateAPIToInternalSchema(
      rule,
      siemClient,
      true,
      false
    );
    return [
      ...acc,
      rulesClient.create({
        data: internalRuleCreate,
      }),
    ];
  }, []);
