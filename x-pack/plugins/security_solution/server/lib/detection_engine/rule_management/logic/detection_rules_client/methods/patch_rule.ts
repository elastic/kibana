/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { PatchRuleArgs } from '../detection_rules_client_interface';
import type { RuleAlertType } from '../../../../rule_schema';
import { getIdError } from '../../../utils/utils';
import { convertPatchAPIToInternalSchema } from '../../../normalization/rule_converters';

import { validateMlAuth, ClientError, toggleRuleEnabledOnUpdate } from '../utils';

import { readRules } from '../read_rules';

export const patchRule = async (
  rulesClient: RulesClient,
  args: PatchRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
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

  const update = await rulesClient.update({
    id: existingRule.id,
    data: patchedRule,
  });

  await toggleRuleEnabledOnUpdate(rulesClient, existingRule, nextParams.enabled);

  if (nextParams.enabled != null) {
    return { ...update, enabled: nextParams.enabled };
  } else {
    return update;
  }
};
