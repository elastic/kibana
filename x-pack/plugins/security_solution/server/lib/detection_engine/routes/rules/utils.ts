/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickBy, countBy } from 'lodash/fp';
import { SavedObject, SavedObjectsFindResponse } from 'kibana/server';
import uuid from 'uuid';

import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { ImportRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import { CreateRulesBulkSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/create_rules_bulk_schema';
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
import {
  createBulkErrorObject,
  BulkError,
  createSuccessObject,
  ImportSuccessError,
  createImportErrorObject,
  OutputError,
} from '../utils';
import { RuleActions } from '../../rule_actions/types';

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
  alert: RuleAlertType,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): Partial<RulesSchema> => {
  return pickBy<RulesSchema>((value: unknown) => value != null, {
    author: alert.params.author ?? [],
    actions: ruleActions?.actions ?? [],
    building_block_type: alert.params.buildingBlockType,
    created_at: alert.createdAt.toISOString(),
    updated_at: alert.updatedAt.toISOString(),
    created_by: alert.createdBy ?? 'elastic',
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
    license: alert.params.license,
    output_index: alert.params.outputIndex,
    max_signals: alert.params.maxSignals,
    machine_learning_job_id: alert.params.machineLearningJobId,
    risk_score: alert.params.riskScore,
    risk_score_mapping: alert.params.riskScoreMapping ?? [],
    rule_name_override: alert.params.ruleNameOverride,
    name: alert.name,
    query: alert.params.query,
    references: alert.params.references,
    saved_id: alert.params.savedId,
    timeline_id: alert.params.timelineId,
    timeline_title: alert.params.timelineTitle,
    meta: alert.params.meta,
    severity: alert.params.severity,
    severity_mapping: alert.params.severityMapping ?? [],
    updated_by: alert.updatedBy ?? 'elastic',
    tags: transformTags(alert.tags),
    to: alert.params.to,
    type: alert.params.type,
    threat: alert.params.threat ?? [],
    threshold: alert.params.threshold,
    throttle: ruleActions?.ruleThrottle || 'no_actions',
    timestamp_override: alert.params.timestampOverride,
    note: alert.params.note,
    version: alert.params.version,
    status: ruleStatus?.attributes.status ?? undefined,
    status_date: ruleStatus?.attributes.statusDate,
    last_failure_at: ruleStatus?.attributes.lastFailureAt ?? undefined,
    last_success_at: ruleStatus?.attributes.lastSuccessAt ?? undefined,
    last_failure_message: ruleStatus?.attributes.lastFailureMessage ?? undefined,
    last_success_message: ruleStatus?.attributes.lastSuccessMessage ?? undefined,
    exceptions_list: alert.params.exceptionsList ?? [],
  });
};

export const transformAlertsToRules = (alerts: RuleAlertType[]): Array<Partial<RulesSchema>> => {
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
  data: Array<Partial<RulesSchema>>;
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
  alert: PartialAlert,
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

export const getDuplicates = (
  ruleDefinitions: CreateRulesBulkSchemaDecoded,
  by: 'rule_id'
): string[] => {
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
