/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodError } from 'zod';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { CreateCustomRuleArgs } from '../detection_rules_client_interface';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { convertCreateAPIToInternalSchema } from '../../../normalization/rule_converters';
import { transformValidate } from '../../../utils/validate';

import { validateMlAuth, DetectionRulesClientValidationError } from '../utils';

export const createCustomRule = async (
  rulesClient: RulesClient,
  args: CreateCustomRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleResponse> => {
  const { params } = args;
  await validateMlAuth(mlAuthz, params.type);

  const internalRule = convertCreateAPIToInternalSchema(params, { immutable: false });
  const rule = await rulesClient.create<RuleParams>({
    data: internalRule,
  });

  try {
    return transformValidate(rule);
  } catch (error) {
    const zodError = error as ZodError;
    throw new DetectionRulesClientValidationError(zodError, rule.params.ruleId);
  }
};
