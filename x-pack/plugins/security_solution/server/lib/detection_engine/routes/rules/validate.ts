/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import {
  FullResponseSchema,
  fullResponseSchema,
} from '../../../../../common/detection_engine/schemas/request';
import {
  RulesSchema,
  rulesSchema,
} from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { PartialAlert } from '../../../../../../alerting/server';
import {
  isAlertType,
  IRuleStatusSOAttributes,
  isRuleStatusSavedObjectAttributes,
} from '../../rules/types';
import { createBulkErrorObject, BulkError } from '../utils';
import { transform, transformAlertToRule } from './utils';
import { RuleParams } from '../../schemas/rule_schemas';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from '../../rule_actions/legacy_get_rule_actions_saved_object';

export const transformValidate = (
  alert: PartialAlert<RuleParams>,
  ruleStatus?: IRuleStatusSOAttributes,
  isRuleRegistryEnabled?: boolean,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): [RulesSchema | null, string | null] => {
  const transformed = transform(alert, ruleStatus, isRuleRegistryEnabled, legacyRuleActions);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, rulesSchema);
  }
};

export const newTransformValidate = (
  alert: PartialAlert<RuleParams>,
  ruleStatus?: IRuleStatusSOAttributes,
  isRuleRegistryEnabled?: boolean,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): [FullResponseSchema | null, string | null] => {
  const transformed = transform(alert, ruleStatus, isRuleRegistryEnabled, legacyRuleActions);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, fullResponseSchema);
  }
};

export const transformValidateBulkError = (
  ruleId: string,
  alert: PartialAlert<RuleParams>,
  ruleStatus?: IRuleStatusSOAttributes,
  isRuleRegistryEnabled?: boolean
): RulesSchema | BulkError => {
  if (isAlertType(isRuleRegistryEnabled ?? false, alert)) {
    if (ruleStatus && isRuleStatusSavedObjectAttributes(ruleStatus)) {
      const transformed = transformAlertToRule(alert, ruleStatus);
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
      const transformed = transformAlertToRule(alert);
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
    }
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};
