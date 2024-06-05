/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MlAuthz } from '../../../../machine_learning/authz';

import type { RuleAlertType } from '../../../rule_schema';
import { throwAuthzError } from '../../../../machine_learning/validation';

export const toggleRuleEnabledOnUpdate = async (
  rulesClient: RulesClient,
  existingRule: RuleAlertType,
  updatedRuleEnabled?: boolean
) => {
  if (existingRule.enabled && updatedRuleEnabled === false) {
    await rulesClient.disable({ id: existingRule.id });
  } else if (!existingRule.enabled && updatedRuleEnabled === true) {
    await rulesClient.enable({ id: existingRule.id });
  }
};

export const validateMlAuth = async (mlAuthz: MlAuthz, ruleType: Type) => {
  throwAuthzError(await mlAuthz.validateRuleType(ruleType));
};

export class ClientError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}
