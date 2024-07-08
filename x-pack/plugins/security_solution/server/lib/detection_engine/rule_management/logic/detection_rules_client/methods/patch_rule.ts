/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { PatchRuleArgs } from '../detection_rules_client_interface';
import { getIdError } from '../../../utils/utils';
import {
  convertPatchAPIToInternalSchema,
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

export const patchRule = async (
  rulesClient: RulesClient,
  args: PatchRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleResponse> => {
  const { nextParams } = args;
  const { rule_id: ruleId, id } = nextParams;

  const existingRule = await readRules({
    rulesClient,
    ruleId,
    id,
  });

  if (existingRule == null) {
    const error = getIdError({ id, ruleId });
    throw new ClientError(error.message, error.statusCode);
  }

  await validateMlAuth(mlAuthz, nextParams.type ?? existingRule.params.type);

  const patchedRule = convertPatchAPIToInternalSchema(nextParams, existingRule);

  const patchedInternalRule = await rulesClient.update({
    id: existingRule.id,
    data: patchedRule,
  });

  const { enabled } = await toggleRuleEnabledOnUpdate(
    rulesClient,
    existingRule,
    nextParams.enabled
  );

  /* Trying to convert the internal rule to a RuleResponse object */
  const parseResult = RuleResponse.safeParse(
    internalRuleToAPIResponse({ ...patchedInternalRule, enabled })
  );

  if (!parseResult.success) {
    throw new RuleResponseValidationError({
      message: stringifyZodError(parseResult.error),
      ruleId: patchedInternalRule.params.ruleId,
    });
  }

  return parseResult.data;
};
