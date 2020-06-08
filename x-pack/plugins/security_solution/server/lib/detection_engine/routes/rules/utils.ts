/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickBy, countBy } from 'lodash/fp';
import { SavedObject, SavedObjectsFindResponse } from 'kibana/server';
import uuid from 'uuid';

import { PartialAlert, FindResult } from '../../../../../../alerts/server';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import {
  RuleAlertType,
  isAlertType,
  isAlertTypes,
  IRuleSavedAttributesSavedObjectAttributes,
  isRuleStatusFindType,
  isRuleStatusFindTypes,
  isRuleStatusSavedObjectType,
} from '../../rules/types';
import { OutputRuleAlertRest, ImportRuleAlertRest, RuleAlertParamsRest } from '../../types';
import {
  createBulkErrorObject,
  BulkError,
  createSuccessObject,
  ImportSuccessError,
  createImportErrorObject,
  OutputError,
} from '../utils';
import { hasListsFeature } from '../../feature_flags';
// import { transformAlertToRuleAction } from '../../../../../common/detection_engine/transform_actions';
import { RuleActions } from '../../rule_actions/types';

type PromiseFromStreams = ImportRuleAlertRest | Error;

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
  alert: RuleAlertType,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): Partial<OutputRuleAlertRest> => {
  return pickBy<OutputRuleAlertRest>((value: unknown) => value != null, {
    actions: ruleActions?.actions ?? [],
    created_at: alert.createdAt.toISOString(),
    updated_at: alert.updatedAt.toISOString(),
    created_by: alert.createdBy,
    description: alert.params.description,
    enabled: alert.enabled,
    anomaly_threshold: alert.params.anomalyThreshold,
    false_positives: alert.params.falsePositives,
    filters: alert.params.filters,
    from: alert.params.from,
    id: alert.id,
    immutable: alert.params.immutable,
    index: alert.params.index,
    interval: alert.schedule.interval,
    rule_id: alert.params.ruleId,
    language: alert.params.language,
    output_index: alert.params.outputIndex,
    max_signals: alert.params.maxSignals,
    machine_learning_job_id: alert.params.machineLearningJobId,
    risk_score: alert.params.riskScore,
    name: alert.name,
    query: alert.params.query,
    references: alert.params.references,
    saved_id: alert.params.savedId,
    timeline_id: alert.params.timelineId,
    timeline_title: alert.params.timelineTitle,
    meta: alert.params.meta,
    severity: alert.params.severity,
    updated_by: alert.updatedBy,
    tags: transformTags(alert.tags),
    to: alert.params.to,
    type: alert.params.type,
    threat: alert.params.threat,
    throttle: ruleActions?.ruleThrottle || 'no_actions',
    note: alert.params.note,
    version: alert.params.version,
    status: ruleStatus?.attributes.status,
    status_date: ruleStatus?.attributes.statusDate,
    last_failure_at: ruleStatus?.attributes.lastFailureAt,
    last_success_at: ruleStatus?.attributes.lastSuccessAt,
    last_failure_message: ruleStatus?.attributes.lastFailureMessage,
    last_success_message: ruleStatus?.attributes.lastSuccessMessage,
    // TODO: (LIST-FEATURE) Remove hasListsFeature() check once we have lists available for a release
    exceptions_list: hasListsFeature() ? alert.params.exceptions_list : null,
  });
};

export const transformAlertsToRules = (
  alerts: RuleAlertType[]
): Array<Partial<OutputRuleAlertRest>> => {
  return alerts.map((alert) => transformAlertToRule(alert));
};

export const transformFindAlerts = (
  findResults: FindResult,
  ruleActions: Array<RuleActions | null>,
  ruleStatuses?: Array<SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>>
): {
  page: number;
  perPage: number;
  total: number;
  data: Array<Partial<OutputRuleAlertRest>>;
} | null => {
  if (!ruleStatuses && isAlertTypes(findResults.data)) {
    return {
      page: findResults.page,
      perPage: findResults.perPage,
      total: findResults.total,
      data: findResults.data.map((alert, idx) => transformAlertToRule(alert, ruleActions[idx])),
    };
  } else if (isAlertTypes(findResults.data) && isRuleStatusFindTypes(ruleStatuses)) {
    return {
      page: findResults.page,
      perPage: findResults.perPage,
      total: findResults.total,
      data: findResults.data.map((alert, idx) =>
        transformAlertToRule(alert, ruleActions[idx], ruleStatuses[idx].saved_objects[0])
      ),
    };
  } else {
    return null;
  }
};

export const transform = (
  alert: PartialAlert,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): Partial<OutputRuleAlertRest> | null => {
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
  alert: PartialAlert,
  ruleActions: RuleActions,
  ruleStatus?: unknown
): Partial<OutputRuleAlertRest> | BulkError => {
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
  alert: PartialAlert,
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

export const getDuplicates = (ruleDefinitions: RuleAlertParamsRest[], by: 'rule_id'): string[] => {
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
        if (ruleId != null) {
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
        } else {
          acc.rulesAcc.set(uuid.v4(), parsedRule);
        }
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
