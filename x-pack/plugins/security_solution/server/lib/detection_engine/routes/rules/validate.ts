/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsFindResponse } from 'kibana/server';

import {
  FullResponseSchema,
  fullResponseSchema,
} from '../../../../../common/detection_engine/schemas/request';
import { validateNonExact } from '../../../../../common/validate';
import {
  RulesSchema,
  rulesSchema,
} from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { PartialAlert } from '../../../../../../alerting/server';
import {
  isAlertType,
  IRuleSavedAttributesSavedObjectAttributes,
  isRuleStatusFindType,
  IRuleStatusSOAttributes,
} from '../../rules/types';
import { createBulkErrorObject, BulkError } from '../utils';
import { transform, transformAlertToRule } from './utils';
import { RuleActions } from '../../rule_actions/types';
import { RuleParams } from '../../schemas/rule_schemas';

export const transformValidate = (
  alert: PartialAlert<RuleParams>,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): [RulesSchema | null, string | null] => {
  const transformed = transform(alert, ruleActions, ruleStatus);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, rulesSchema);
  }
};

export const newTransformValidate = (
  alert: PartialAlert<RuleParams>,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): [FullResponseSchema | null, string | null] => {
  const transformed = transform(alert, ruleActions, ruleStatus);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, fullResponseSchema);
  }
};

export const transformValidateBulkError = (
  ruleId: string,
  alert: PartialAlert<RuleParams>,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObjectsFindResponse<IRuleStatusSOAttributes>
): RulesSchema | BulkError => {
  if (isAlertType(alert)) {
    if (isRuleStatusFindType(ruleStatus) && ruleStatus?.saved_objects.length > 0) {
      const transformed = transformAlertToRule(
        alert,
        ruleActions,
        ruleStatus?.saved_objects[0] ?? ruleStatus
      );
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
