/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import type { PartialRule } from '@kbn/alerting-plugin/server';
import type { RuleExecutionSummary } from '../../../../../common/detection_engine/rule_monitoring';
import { RuleResponse } from '../../../../../common/detection_engine/rule_schema';
import type { RuleParams } from '../../rule_schema';
import { isAlertType } from '../../rule_schema';
import type { BulkError } from '../../routes/utils';
import { createBulkErrorObject } from '../../routes/utils';
import { transform } from './utils';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRulesActionsSavedObject } from '../../rule_actions_legacy';
import { internalRuleToAPIResponse } from '../normalization/rule_converters';

export const transformValidate = (
  rule: PartialRule<RuleParams>,
  ruleExecutionSummary: RuleExecutionSummary | null,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): [RuleResponse | null, string | null] => {
  const transformed = transform(rule, ruleExecutionSummary, legacyRuleActions);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, RuleResponse);
  }
};

export const transformValidateBulkError = (
  ruleId: string,
  rule: PartialRule<RuleParams>,
  ruleExecutionSummary: RuleExecutionSummary | null
): RuleResponse | BulkError => {
  if (isAlertType(rule)) {
    const transformed = internalRuleToAPIResponse(rule, ruleExecutionSummary);
    const [validated, errors] = validateNonExact(transformed, RuleResponse);
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
