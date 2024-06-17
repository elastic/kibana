/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { CreateCustomRuleArgs } from '../detection_rules_client_interface';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleAlertType, RuleParams } from '../../../../rule_schema';
import { convertCreateAPIToInternalSchema } from '../../../normalization/rule_converters';

import { validateMlAuth } from '../utils';

export const createCustomRule = async (
  rulesClient: RulesClient,
  args: CreateCustomRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { params } = args;
  await validateMlAuth(mlAuthz, params.type);

  const internalRule = convertCreateAPIToInternalSchema(params, { immutable: false });
  const rule = await rulesClient.create<RuleParams>({
    data: internalRule,
  });

  return rule;
};
