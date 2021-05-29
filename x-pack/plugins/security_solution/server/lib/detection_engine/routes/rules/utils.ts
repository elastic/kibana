/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy } from 'lodash/fp';
import { SavedObject } from 'kibana/server';
import uuid from 'uuid';

import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { ImportRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import { CreateRulesBulkSchema } from '../../../../../common/detection_engine/schemas/request/create_rules_bulk_schema';
import { PartialAlert, FindResult } from '../../../../../../alerting/server';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import {
  RuleAlertType,
  isAlertType,
  IRuleSavedAttributesSavedObjectAttributes,
  isRuleStatusFindType,
  isRuleStatusSavedObjectType,
  IRuleStatusSOAttributes,
} from '../../rules/types';
import {
  createBulkErrorObject,
  BulkError,
  createSuccessObject,
  ImportSuccessError,
  createImportErrorObject,
  OutputError,
} from '../utils';
import { RuleActions } from '../../rule_actions/types';
import { internalRuleToAPIResponse } from '../../schemas/rule_converters';
import { RuleParams } from '../../schemas/rule_schemas';
import { SanitizedAlert } from '../../../../../../alerting/common';

type PromiseFromStreams = ImportRulesSchemaDecoded | Error;

export const getIdError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}): OutputError => {
  if (id != null) {
    return {
      message: `id: "${id}" not found`,
      statusCode: 404,
    };
  } else if (ruleId != null) {
    return {
      message: `rule_id: "${ruleId}" not found`,
      statusCode: 404,
    };
  } else {
    return {
      message: 'id or rule_id should have been defined',
      statusCode: 404,
    };
  }
};

export const getIdBulkError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}): BulkError => {
  if (id != null && ruleId != null) {
    return createBulkErrorObject({
      id,
      ruleId,
      statusCode: 404,
      message: `id: "${id}" and rule_id: "${ruleId}" not found`,
    });
  } else if (id != null) {
    return createBulkErrorObject({
      id,
      statusCode: 404,
      message: `id: "${id}" not found`,
    });
  } else if (ruleId != null) {
    return createBulkErrorObject({
      ruleId,
      statusCode: 404,
      message: `rule_id: "${ruleId}" not found`,
    });
  } else {
    return createBulkErrorObject({
      statusCode: 404,
      message: `id or rule_id should have been defined`,
    });
  }
};

export const transformTags = (tags: string[]): string[] => {
  return tags.filter((tag) => !tag.startsWith(INTERNAL_IDENTIFIER));
};

// Transforms the data but will remove any null or undefined it encounters and not include
// those on the export
export const transformAlertToRule = (
  alert: SanitizedAlert<RuleParams>,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): Partial<RulesSchema> => {
  return internalRuleToAPIResponse(alert, ruleActions, ruleStatus?.attributes);
};

export const transformAlertsToRules = (alerts: RuleAlertType[]): Array<Partial<RulesSchema>> => {
  return alerts.map((alert) => transformAlertToRule(alert));
};

export const transformFindAlerts = (
  findResults: FindResult<RuleParams>,
  ruleActions: { [key: string]: RuleActions | undefined },
  ruleStatuses: { [key: string]: IRuleStatusSOAttributes[] | undefined }
): {
  page: number;
  perPage: number;
  total: number;
  data: Array<Partial<RulesSchema>>;
} | null => {
  return {
    page: findResults.page,
    perPage: findResults.perPage,
    total: findResults.total,
    data: findResults.data.map((alert) => {
      const statuses = ruleStatuses[alert.id];
      const status = statuses ? statuses[0] : undefined;
      return internalRuleToAPIResponse(alert, ruleActions[alert.id], status);
    }),
  };
};

export const transform = (
  alert: PartialAlert<RuleParams>,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): Partial<RulesSchema> | null => {
  if (isAlertType(alert)) {
    return transformAlertToRule(
      alert,
      ruleActions,
      isRuleStatusSavedObjectType(ruleStatus) ? ruleStatus : undefined
    );
  }

  return null;
};

export const transformOrBulkError = (
  ruleId: string,
  alert: PartialAlert<RuleParams>,
  ruleActions: RuleActions,
  ruleStatus?: unknown
): Partial<RulesSchema> | BulkError => {
  if (isAlertType(alert)) {
    if (isRuleStatusFindType(ruleStatus) && ruleStatus?.saved_objects.length > 0) {
      return transformAlertToRule(alert, ruleActions, ruleStatus?.saved_objects[0] ?? ruleStatus);
    } else {
      return transformAlertToRule(alert, ruleActions);
    }
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};

export const transformOrImportError = (
  ruleId: string,
  alert: PartialAlert<RuleParams>,
  existingImportSuccessError: ImportSuccessError
): ImportSuccessError => {
  if (isAlertType(alert)) {
    return createSuccessObject(existingImportSuccessError);
  } else {
    return createImportErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
      existingImportSuccessError,
    });
  }
};

export const getDuplicates = (ruleDefinitions: CreateRulesBulkSchema, by: 'rule_id'): string[] => {
  const mappedDuplicates = countBy(
    by,
    ruleDefinitions.filter((r) => r[by] != null)
  );
  const hasDuplicates = Object.values(mappedDuplicates).some((i) => i > 1);
  if (hasDuplicates) {
    return Object.keys(mappedDuplicates).filter((key) => mappedDuplicates[key] > 1);
  }
  return [];
};

export const getTupleDuplicateErrorsAndUniqueRules = (
  rules: PromiseFromStreams[],
  isOverwrite: boolean
): [BulkError[], PromiseFromStreams[]] => {
  const { errors, rulesAcc } = rules.reduce(
    (acc, parsedRule) => {
      if (parsedRule instanceof Error) {
        acc.rulesAcc.set(uuid.v4(), parsedRule);
      } else {
        const { rule_id: ruleId } = parsedRule;
        if (acc.rulesAcc.has(ruleId) && !isOverwrite) {
          acc.errors.set(
            uuid.v4(),
            createBulkErrorObject({
              ruleId,
              statusCode: 400,
              message: `More than one rule with rule-id: "${ruleId}" found`,
            })
          );
        }
        acc.rulesAcc.set(ruleId, parsedRule);
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkError>(),
      rulesAcc: new Map<string, PromiseFromStreams>(),
    }
  );

  return [Array.from(errors.values()), Array.from(rulesAcc.values())];
};
