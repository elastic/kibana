/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsFindResponse } from 'kibana/server';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';

import { formatErrors } from '../../../../utils/build_validation/format_errors';
import { exactCheck } from '../../../../utils/build_validation/exact_check';
import { PartialAlert, FindResult } from '../../../../../../alerting/server';
import {
  isAlertType,
  IRuleSavedAttributesSavedObjectAttributes,
  isRuleStatusFindType,
} from '../../rules/types';
import { OutputRuleAlertRest } from '../../types';
import { createBulkErrorObject, BulkError } from '../utils';
import { rulesSchema, RulesSchema } from '../schemas/response/rules_schema';
import { transformFindAlerts, transform, transformAlertToRule } from './utils';
import { findRulesSchema } from '../schemas/response/find_rules_schema';
import { RuleActions } from '../../rule_actions/types';

export const transformValidateFindAlerts = (
  findResults: FindResult,
  ruleActions: Array<RuleActions | null>,
  ruleStatuses?: Array<SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>>
): [
  {
    page: number;
    perPage: number;
    total: number;
    data: Array<Partial<OutputRuleAlertRest>>;
  } | null,
  string | null
] => {
  const transformed = transformFindAlerts(findResults, ruleActions, ruleStatuses);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    const decoded = findRulesSchema.decode(transformed);
    const checked = exactCheck(transformed, decoded);
    const left = (errors: t.Errors): string[] => formatErrors(errors);
    const right = (): string[] => [];
    const piped = pipe(checked, fold(left, right));
    if (piped.length === 0) {
      return [transformed, null];
    } else {
      return [null, piped.join(',')];
    }
  }
};

export const transformValidate = (
  alert: PartialAlert,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): [RulesSchema | null, string | null] => {
  const transformed = transform(alert, ruleActions, ruleStatus);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validate(transformed, rulesSchema);
  }
};

export const transformValidateBulkError = (
  ruleId: string,
  alert: PartialAlert,
  ruleActions?: RuleActions | null,
  ruleStatus?: unknown
): RulesSchema | BulkError => {
  if (isAlertType(alert)) {
    if (isRuleStatusFindType(ruleStatus) && ruleStatus?.saved_objects.length > 0) {
      const transformed = transformAlertToRule(
        alert,
        ruleActions,
        ruleStatus?.saved_objects[0] ?? ruleStatus
      );
      const [validated, errors] = validate(transformed, rulesSchema);
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
      const [validated, errors] = validate(transformed, rulesSchema);
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

export const validate = <T extends t.Mixed>(
  obj: object,
  schema: T
): [t.TypeOf<T> | null, string | null] => {
  const decoded = schema.decode(obj);
  const checked = exactCheck(obj, decoded);
  const left = (errors: t.Errors): [T | null, string | null] => [
    null,
    formatErrors(errors).join(','),
  ];
  const right = (output: T): [T | null, string | null] => [output, null];
  return pipe(checked, fold(left, right));
};
