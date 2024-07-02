/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { CreatePrebuiltRuleArgs } from '../detection_rules_client_interface';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleParams } from '../../../../rule_schema';
import {
  convertCreateAPIToInternalSchema,
  internalRuleToAPIResponse,
} from '../../../normalization/rule_converters';
import { validateMlAuth, RuleResponseValidationError } from '../utils';

export const createPrebuiltRule = async (
  rulesClient: RulesClient,
  args: CreatePrebuiltRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleResponse> => {
  const { params } = args;

  await validateMlAuth(mlAuthz, params.type);

  const internalRule = convertCreateAPIToInternalSchema(params, {
    immutable: true,
    defaultEnabled: false,
  });

  const rule = await rulesClient.create<RuleParams>({
    data: internalRule,
  });

  /* Trying to convert the rule to a RuleResponse object */
  const parseResult = RuleResponse.safeParse(internalRuleToAPIResponse(rule));

  if (!parseResult.success) {
    throw new RuleResponseValidationError({
      message: stringifyZodError(parseResult.error),
      ruleId: rule.params.ruleId,
    });
  }

  return parseResult.data;
};
