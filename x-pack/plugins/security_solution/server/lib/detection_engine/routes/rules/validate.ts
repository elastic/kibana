/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import { RuleExecutionSummary } from '../../../../../common/detection_engine/schemas/common';
import {
  FullResponseSchema,
  fullResponseSchema,
} from '../../../../../common/detection_engine/schemas/request';
import {
  RulesSchema,
  rulesSchema,
} from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { PartialRule } from '../../../../../../alerting/server';
import { isAlertType } from '../../rules/types';
import { createBulkErrorObject, BulkError } from '../utils';
import { transform } from './utils';
import { RuleParams } from '../../schemas/rule_schemas';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from '../../rule_actions/legacy_get_rule_actions_saved_object';
import { internalRuleToAPIResponse } from '../../schemas/rule_converters';

export const transformValidate = (
  rule: PartialRule<RuleParams>,
  ruleExecutionSummary: RuleExecutionSummary | null,
  isRuleRegistryEnabled?: boolean,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): [RulesSchema | null, string | null] => {
  const transformed = transform(
    rule,
    ruleExecutionSummary,
    isRuleRegistryEnabled,
    legacyRuleActions
  );
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, rulesSchema);
  }
};

export const newTransformValidate = (
  rule: PartialRule<RuleParams>,
  ruleExecutionSummary: RuleExecutionSummary | null,
  isRuleRegistryEnabled?: boolean,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): [FullResponseSchema | null, string | null] => {
  const transformed = transform(
    rule,
    ruleExecutionSummary,
    isRuleRegistryEnabled,
    legacyRuleActions
  );
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, fullResponseSchema);
  }
};

export const transformValidateBulkError = (
  ruleId: string,
  rule: PartialRule<RuleParams>,
  ruleExecutionSummary: RuleExecutionSummary | null,
  isRuleRegistryEnabled?: boolean
): RulesSchema | BulkError => {
  if (isAlertType(isRuleRegistryEnabled ?? false, rule)) {
    const transformed = internalRuleToAPIResponse(rule, ruleExecutionSummary);
    const [validated, errors] = validateNonExact(transformed, rulesSchema);
    if (errors != null || validated == null) {
      return createBulkErrorObject({
        ruleId,
        statusCode: 500,
        message: errors ?? 'Internal error transforming',
      });
    } else {
      return validated;
    }
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};
