/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MlAuthz } from '../../../../machine_learning/authz';
import type { PatchRuleRequestBody } from '../../../../../../common/api/detection_engine';

import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';

import {
  convertPatchAPIToInternalSchema,
  convertCreateAPIToInternalSchema,
} from '../../normalization/rule_converters';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import type { RuleAlertType, RuleParams } from '../../../rule_schema';
import { throwAuthzError } from '../../../../machine_learning/validation';

export const _patchRule = async (
  rulesClient: RulesClient,
  patchRulePayload: _PatchRuleProps
): Promise<RuleAlertType> => {
  const { nextParams, existingRule } = patchRulePayload;

  const patchedRule = convertPatchAPIToInternalSchema(nextParams, existingRule);

  const update = await rulesClient.update({
    id: existingRule.id,
    data: patchedRule,
  });

  return update;
};

export const _upgradePrebuiltRuleWithTypeChange = async (
  rulesClient: RulesClient,
  ruleAsset: PrebuiltRuleAsset,
  existingRule: RuleAlertType
) => {
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

  const rule = await rulesClient.create<RuleParams>({
    data: internalRule,
    options: { id: existingRule.id },
  });

  return rule;
};

export const _toggleRuleEnabledOnUpdate = async (
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

export const _validateMlAuth = async (mlAuthz: MlAuthz, ruleType: Type) => {
  throwAuthzError(await mlAuthz.validateRuleType(ruleType));
};

export interface _PatchRuleProps {
  existingRule: RuleAlertType;
  nextParams: PatchRuleRequestBody;
}

export class ClientError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}
