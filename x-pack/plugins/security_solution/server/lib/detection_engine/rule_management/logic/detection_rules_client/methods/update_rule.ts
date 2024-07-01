/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { UpdateRuleArgs } from '../detection_rules_client_interface';
import { getIdError } from '../../../utils/utils';
import {
  convertUpdateAPIToInternalSchema,
  internalRuleToAPIResponse,
} from '../../../normalization/rule_converters';
import { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';

import {
  validateMlAuth,
  ClientError,
  toggleRuleEnabledOnUpdate,
  RuleResponseValidationError,
} from '../utils';

import { readRules } from '../read_rules';

export const updateRule = async (
  rulesClient: RulesClient,
  args: UpdateRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleResponse> => {
  const { ruleUpdate } = args;
  const { rule_id: ruleId, id } = ruleUpdate;

  await validateMlAuth(mlAuthz, ruleUpdate.type);

  const existingRule = await readRules({
    rulesClient,
    ruleId,
    id,
  });

  if (existingRule == null) {
    const error = getIdError({ id, ruleId });
    throw new ClientError(error.message, error.statusCode);
  }

  const newInternalRule = convertUpdateAPIToInternalSchema({
    existingRule,
    ruleUpdate,
  });

  const updatedInternalRule = await rulesClient.update({
    id: existingRule.id,
    data: newInternalRule,
  });

  const { enabled } = await toggleRuleEnabledOnUpdate(
    rulesClient,
    existingRule,
    ruleUpdate.enabled
  );

  /* Trying to convert the internal rule to a RuleResponse object */
  const parseResult = RuleResponse.safeParse(
    internalRuleToAPIResponse({ ...updatedInternalRule, enabled })
  );

  if (!parseResult.success) {
    throw new RuleResponseValidationError({
      message: stringifyZodError(parseResult.error),
      ruleId: updatedInternalRule.params.ruleId,
    });
  }

  return parseResult.data;
};
