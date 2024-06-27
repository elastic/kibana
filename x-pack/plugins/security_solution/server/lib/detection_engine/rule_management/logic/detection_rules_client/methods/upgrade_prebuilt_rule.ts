/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import type { UpgradePrebuiltRuleArgs } from '../detection_rules_client_interface';
import {
  convertPatchAPIToInternalSchema,
  convertCreateAPIToInternalSchema,
  internalRuleToAPIResponse,
} from '../../../normalization/rule_converters';
import { transformAlertToRuleAction } from '../../../../../../../common/detection_engine/transform_actions';
import { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';

import { validateMlAuth, ClientError, RuleResponseValidationError } from '../utils';

import { readRules } from '../read_rules';

export const upgradePrebuiltRule = async (
  rulesClient: RulesClient,
  upgradePrebuiltRulePayload: UpgradePrebuiltRuleArgs,
  mlAuthz: MlAuthz
): Promise<RuleResponse> => {
  const { ruleAsset } = upgradePrebuiltRulePayload;

  await validateMlAuth(mlAuthz, ruleAsset.type);

  const existingRule = await readRules({
    rulesClient,
    ruleId: ruleAsset.rule_id,
    id: undefined,
  });

  if (!existingRule) {
    throw new ClientError(`Failed to find rule ${ruleAsset.rule_id}`, 500);
  }

  if (ruleAsset.type !== existingRule.params.type) {
    // If we're trying to change the type of a prepackaged rule, we need to delete the old one
    // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
    // and exception lists from the old rule
    await rulesClient.delete({ id: existingRule.id });

    const internalRule = convertCreateAPIToInternalSchema(
      {
        ...ruleAsset,
        enabled: existingRule.enabled,
        exceptions_list: existingRule.params.exceptionsList,
        actions: existingRule.actions.map(transformAlertToRuleAction),
        timeline_id: existingRule.params.timelineId,
        timeline_title: existingRule.params.timelineTitle,
      },
      { immutable: true, defaultEnabled: existingRule.enabled }
    );

    const createdRule = await rulesClient.create<RuleParams>({
      data: internalRule,
      options: { id: existingRule.id },
    });

    /* Trying to convert the rule to a RuleResponse object */
    const parseResult = RuleResponse.safeParse(internalRuleToAPIResponse(createdRule));

    if (!parseResult.success) {
      throw new RuleResponseValidationError({
        message: stringifyZodError(parseResult.error),
        ruleId: createdRule.params.ruleId,
      });
    }

    return parseResult.data;
  }

  // Else, simply patch it.
  const patchedRule = convertPatchAPIToInternalSchema(ruleAsset, existingRule);

  const patchedInternalRule = await rulesClient.update({
    id: existingRule.id,
    data: patchedRule,
  });

  /* Trying to convert the internal rule to a RuleResponse object */
  const parseResult = RuleResponse.safeParse(internalRuleToAPIResponse(patchedInternalRule));

  if (!parseResult.success) {
    throw new RuleResponseValidationError({
      message: stringifyZodError(parseResult.error),
      ruleId: patchedInternalRule.params.ruleId,
    });
  }

  return parseResult.data;
};
