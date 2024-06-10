/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { CreatePrebuiltRuleArgs } from '../detection_rules_client_interface';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleAlertType, RuleParams } from '../../../../rule_schema';
import { convertCreateAPIToInternalSchema } from '../../../normalization/rule_converters';

import { validateMlAuth } from '../utils';

export const createPrebuiltRule = async (
  rulesClient: RulesClient,
  args: CreatePrebuiltRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { ruleAsset } = args;

  await validateMlAuth(mlAuthz, ruleAsset.type);

  const internalRule = convertCreateAPIToInternalSchema(ruleAsset, {
    immutable: true,
    defaultEnabled: false,
  });

  const rule = await rulesClient.create<RuleParams>({
    data: internalRule,
  });

  return rule;
};
