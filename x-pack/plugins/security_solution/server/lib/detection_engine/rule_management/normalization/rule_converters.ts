/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import { stringifyZodError } from '@kbn/zod-helpers';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import type { ResolvedSanitizedRule, SanitizedRule } from '@kbn/alerting-plugin/common';

import type { RequiredOptional } from '@kbn/zod-helpers';
import {
  DEFAULT_INDICATOR_SOURCE_PATH,
  DEFAULT_MAX_SIGNALS,
  SERVER_APP_ID,
} from '../../../../../common/constants';

import type { PatchRuleRequestBody } from '../../../../../common/api/detection_engine/rule_management';
import type {
  RuleCreateProps,
  RuleUpdateProps,
  TypeSpecificCreateProps,
  TypeSpecificResponse,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import {
  EqlRulePatchFields,
  EsqlRulePatchFields,
  MachineLearningRulePatchFields,
  NewTermsRulePatchFields,
  QueryRulePatchFields,
  SavedQueryRulePatchFields,
  ThreatMatchRulePatchFields,
  ThresholdRulePatchFields,
  RuleResponse,
} from '../../../../../common/api/detection_engine/model/rule_schema';

import {
  transformAlertToRuleAction,
  transformAlertToRuleResponseAction,
  transformRuleToAlertAction,
  transformRuleToAlertResponseAction,
} from '../../../../../common/detection_engine/transform_actions';

import {
  normalizeMachineLearningJobIds,
  normalizeThresholdObject,
} from '../../../../../common/detection_engine/utils';

import { assertUnreachable } from '../../../../../common/utility_types';

import type {
  InternalRuleCreate,
  RuleParams,
  TypeSpecificRuleParams,
  BaseRuleParams,
  EqlRuleParams,
  EqlSpecificRuleParams,
  EsqlRuleParams,
  EsqlSpecificRuleParams,
  ThreatRuleParams,
  ThreatSpecificRuleParams,
  QueryRuleParams,
  QuerySpecificRuleParams,
  SavedQuerySpecificRuleParams,
  SavedQueryRuleParams,
  ThresholdRuleParams,
  ThresholdSpecificRuleParams,
  MachineLearningRuleParams,
  MachineLearningSpecificRuleParams,
  InternalRuleUpdate,
  NewTermsRuleParams,
  NewTermsSpecificRuleParams,
  RuleSourceCamelCased,
} from '../../rule_schema';
import { transformFromAlertThrottle, transformToActionFrequency } from './rule_actions';
import {
  addEcsToRequiredFields,
  convertAlertSuppressionToCamel,
  convertAlertSuppressionToSnake,
  migrateLegacyInvestigationFields,
} from '../utils/utils';
import { createRuleExecutionSummary } from '../../rule_monitoring';
import type { PrebuiltRuleAsset } from '../../prebuilt_rules';
import { convertObjectKeysToSnakeCase } from '../../../../utils/object_case_converters';

const DEFAULT_FROM = 'now-6m' as const;
const DEFAULT_TO = 'now' as const;
const DEFAULT_INTERVAL = '5m' as const;

// These functions provide conversions from the request API schema to the internal rule schema and from the internal rule schema
// to the response API schema. This provides static type-check assurances that the internal schema is in sync with the API schema for
// required and default-able fields. However, it is still possible to add an optional field to the API schema
// without causing a type-check error here.

// Converts params from the snake case API format to the internal camel case format AND applies default values where needed.
// Notice that params.language is possibly undefined for most rule types in the API but we default it to kuery to match
// the legacy API behavior
export const typeSpecificSnakeToCamel = (
  params: TypeSpecificCreateProps
): TypeSpecificRuleParams => {
  switch (params.type) {
    case 'eql': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        dataViewId: params.data_view_id,
        query: params.query,
        filters: params.filters,
        timestampField: params.timestamp_field,
        eventCategoryOverride: params.event_category_override,
        tiebreakerField: params.tiebreaker_field,
        alertSuppression: convertAlertSuppressionToCamel(params.alert_suppression),
      };
    }
    case 'esql': {
      return {
        type: params.type,
        language: params.language,
        query: params.query,
        alertSuppression: convertAlertSuppressionToCamel(params.alert_suppression),
      };
    }
    case 'threat_match': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        dataViewId: params.data_view_id,
        query: params.query,
        filters: params.filters,
        savedId: params.saved_id,
        threatFilters: params.threat_filters,
        threatQuery: params.threat_query,
        threatMapping: params.threat_mapping,
        threatLanguage: params.threat_language,
        threatIndex: params.threat_index,
        threatIndicatorPath: params.threat_indicator_path ?? DEFAULT_INDICATOR_SOURCE_PATH,
        concurrentSearches: params.concurrent_searches,
        itemsPerSearch: params.items_per_search,
        alertSuppression: convertAlertSuppressionToCamel(params.alert_suppression),
      };
    }
    case 'query': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        dataViewId: params.data_view_id,
        query: params.query ?? '',
        filters: params.filters,
        savedId: params.saved_id,
        responseActions: params.response_actions?.map(transformRuleToAlertResponseAction),
        alertSuppression: convertAlertSuppressionToCamel(params.alert_suppression),
      };
    }
    case 'saved_query': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        query: params.query,
        filters: params.filters,
        savedId: params.saved_id,
        dataViewId: params.data_view_id,
        responseActions: params.response_actions?.map(transformRuleToAlertResponseAction),
        alertSuppression: convertAlertSuppressionToCamel(params.alert_suppression),
      };
    }
    case 'threshold': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        dataViewId: params.data_view_id,
        query: params.query,
        filters: params.filters,
        savedId: params.saved_id,
        threshold: normalizeThresholdObject(params.threshold),
        alertSuppression: params.alert_suppression?.duration
          ? { duration: params.alert_suppression.duration }
          : undefined,
      };
    }
    case 'machine_learning': {
      return {
        type: params.type,
        anomalyThreshold: params.anomaly_threshold,
        machineLearningJobId: normalizeMachineLearningJobIds(params.machine_learning_job_id),
        alertSuppression: convertAlertSuppressionToCamel(params.alert_suppression),
      };
    }
    case 'new_terms': {
      return {
        type: params.type,
        query: params.query,
        newTermsFields: params.new_terms_fields,
        historyWindowStart: params.history_window_start,
        index: params.index,
        filters: params.filters,
        language: params.language ?? 'kuery',
        dataViewId: params.data_view_id,
        alertSuppression: convertAlertSuppressionToCamel(params.alert_suppression),
      };
    }
    default: {
      return assertUnreachable(params);
    }
  }
};

const patchEqlParams = (
  params: EqlRulePatchFields,
  existingRule: EqlRuleParams
): EqlSpecificRuleParams => {
  return {
    type: existingRule.type,
    language: params.language ?? existingRule.language,
    index: params.index ?? existingRule.index,
    dataViewId: params.data_view_id ?? existingRule.dataViewId,
    query: params.query ?? existingRule.query,
    filters: params.filters ?? existingRule.filters,
    timestampField: params.timestamp_field ?? existingRule.timestampField,
    eventCategoryOverride: params.event_category_override ?? existingRule.eventCategoryOverride,
    tiebreakerField: params.tiebreaker_field ?? existingRule.tiebreakerField,
    alertSuppression:
      convertAlertSuppressionToCamel(params.alert_suppression) ?? existingRule.alertSuppression,
  };
};

const patchEsqlParams = (
  params: EsqlRulePatchFields,
  existingRule: EsqlRuleParams
): EsqlSpecificRuleParams => {
  return {
    type: existingRule.type,
    language: params.language ?? existingRule.language,
    query: params.query ?? existingRule.query,
    alertSuppression:
      convertAlertSuppressionToCamel(params.alert_suppression) ?? existingRule.alertSuppression,
  };
};

const patchThreatMatchParams = (
  params: ThreatMatchRulePatchFields,
  existingRule: ThreatRuleParams
): ThreatSpecificRuleParams => {
  return {
    type: existingRule.type,
    language: params.language ?? existingRule.language,
    index: params.index ?? existingRule.index,
    dataViewId: params.data_view_id ?? existingRule.dataViewId,
    query: params.query ?? existingRule.query,
    filters: params.filters ?? existingRule.filters,
    savedId: params.saved_id ?? existingRule.savedId,
    threatFilters: params.threat_filters ?? existingRule.threatFilters,
    threatQuery: params.threat_query ?? existingRule.threatQuery,
    threatMapping: params.threat_mapping ?? existingRule.threatMapping,
    threatLanguage: params.threat_language ?? existingRule.threatLanguage,
    threatIndex: params.threat_index ?? existingRule.threatIndex,
    threatIndicatorPath: params.threat_indicator_path ?? existingRule.threatIndicatorPath,
    concurrentSearches: params.concurrent_searches ?? existingRule.concurrentSearches,
    itemsPerSearch: params.items_per_search ?? existingRule.itemsPerSearch,
    alertSuppression:
      convertAlertSuppressionToCamel(params.alert_suppression) ?? existingRule.alertSuppression,
  };
};

const patchQueryParams = (
  params: QueryRulePatchFields,
  existingRule: QueryRuleParams
): QuerySpecificRuleParams => {
  return {
    type: existingRule.type,
    language: params.language ?? existingRule.language,
    index: params.index ?? existingRule.index,
    dataViewId: params.data_view_id ?? existingRule.dataViewId,
    query: params.query ?? existingRule.query,
    filters: params.filters ?? existingRule.filters,
    savedId: params.saved_id ?? existingRule.savedId,
    responseActions:
      params.response_actions?.map(transformRuleToAlertResponseAction) ??
      existingRule.responseActions,
    alertSuppression:
      convertAlertSuppressionToCamel(params.alert_suppression) ?? existingRule.alertSuppression,
  };
};

const patchSavedQueryParams = (
  params: SavedQueryRulePatchFields,
  existingRule: SavedQueryRuleParams
): SavedQuerySpecificRuleParams => {
  return {
    type: existingRule.type,
    language: params.language ?? existingRule.language,
    index: params.index ?? existingRule.index,
    dataViewId: params.data_view_id ?? existingRule.dataViewId,
    query: params.query ?? existingRule.query,
    filters: params.filters ?? existingRule.filters,
    savedId: params.saved_id ?? existingRule.savedId,
    responseActions:
      params.response_actions?.map(transformRuleToAlertResponseAction) ??
      existingRule.responseActions,
    alertSuppression:
      convertAlertSuppressionToCamel(params.alert_suppression) ?? existingRule.alertSuppression,
  };
};

const patchThresholdParams = (
  params: ThresholdRulePatchFields,
  existingRule: ThresholdRuleParams
): ThresholdSpecificRuleParams => {
  return {
    type: existingRule.type,
    language: params.language ?? existingRule.language,
    index: params.index ?? existingRule.index,
    dataViewId: params.data_view_id ?? existingRule.dataViewId,
    query: params.query ?? existingRule.query,
    filters: params.filters ?? existingRule.filters,
    savedId: params.saved_id ?? existingRule.savedId,
    threshold: params.threshold
      ? normalizeThresholdObject(params.threshold)
      : existingRule.threshold,
    alertSuppression: params.alert_suppression ?? existingRule.alertSuppression,
  };
};

const patchMachineLearningParams = (
  params: MachineLearningRulePatchFields,
  existingRule: MachineLearningRuleParams
): MachineLearningSpecificRuleParams => {
  return {
    type: existingRule.type,
    anomalyThreshold: params.anomaly_threshold ?? existingRule.anomalyThreshold,
    machineLearningJobId: params.machine_learning_job_id
      ? normalizeMachineLearningJobIds(params.machine_learning_job_id)
      : existingRule.machineLearningJobId,
    alertSuppression:
      convertAlertSuppressionToCamel(params.alert_suppression) ?? existingRule.alertSuppression,
  };
};

const patchNewTermsParams = (
  params: NewTermsRulePatchFields,
  existingRule: NewTermsRuleParams
): NewTermsSpecificRuleParams => {
  return {
    type: existingRule.type,
    language: params.language ?? existingRule.language,
    index: params.index ?? existingRule.index,
    dataViewId: params.data_view_id ?? existingRule.dataViewId,
    query: params.query ?? existingRule.query,
    filters: params.filters ?? existingRule.filters,
    newTermsFields: params.new_terms_fields ?? existingRule.newTermsFields,
    historyWindowStart: params.history_window_start ?? existingRule.historyWindowStart,
    alertSuppression:
      convertAlertSuppressionToCamel(params.alert_suppression) ?? existingRule.alertSuppression,
  };
};

export const patchTypeSpecificSnakeToCamel = (
  params: PatchRuleRequestBody,
  existingRule: RuleParams
): TypeSpecificRuleParams => {
  // Here we do the validation of patch params by rule type to ensure that the fields that are
  // passed in to patch are of the correct type, e.g. `query` is a string. Since the combined patch schema
  // is a union of types where everything is optional, it's hard to do the validation before we know the rule type -
  // a patch request that defines `event_category_override` as a number would not be assignable to the EQL patch schema,
  // but would be assignable to the other rule types since they don't specify `event_category_override`.
  switch (existingRule.type) {
    case 'eql': {
      const result = EqlRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchEqlParams(result.data, existingRule);
    }
    case 'esql': {
      const result = EsqlRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchEsqlParams(result.data, existingRule);
    }
    case 'threat_match': {
      const result = ThreatMatchRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchThreatMatchParams(result.data, existingRule);
    }
    case 'query': {
      const result = QueryRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchQueryParams(result.data, existingRule);
    }
    case 'saved_query': {
      const result = SavedQueryRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchSavedQueryParams(result.data, existingRule);
    }
    case 'threshold': {
      const result = ThresholdRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchThresholdParams(result.data, existingRule);
    }
    case 'machine_learning': {
      const result = MachineLearningRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchMachineLearningParams(result.data, existingRule);
    }
    case 'new_terms': {
      const result = NewTermsRulePatchFields.safeParse(params);
      if (!result.success) {
        throw new BadRequestError(stringifyZodError(result.error));
      }
      return patchNewTermsParams(result.data, existingRule);
    }
    default: {
      return assertUnreachable(existingRule);
    }
  }
};

interface ConvertUpdateAPIToInternalSchemaProps {
  existingRule: SanitizedRule<RuleParams>;
  ruleUpdate: RuleUpdateProps;
}

export const convertUpdateAPIToInternalSchema = ({
  existingRule,
  ruleUpdate,
}: ConvertUpdateAPIToInternalSchemaProps) => {
  const alertActions =
    ruleUpdate.actions?.map((action) => transformRuleToAlertAction(action)) ?? [];
  const actions = transformToActionFrequency(alertActions, ruleUpdate.throttle);

  const typeSpecificParams = typeSpecificSnakeToCamel(ruleUpdate);

  const newInternalRule: InternalRuleUpdate = {
    name: ruleUpdate.name,
    tags: ruleUpdate.tags ?? [],
    params: {
      author: ruleUpdate.author ?? [],
      buildingBlockType: ruleUpdate.building_block_type,
      description: ruleUpdate.description,
      ruleId: existingRule.params.ruleId,
      falsePositives: ruleUpdate.false_positives ?? [],
      from: ruleUpdate.from ?? 'now-6m',
      investigationFields: ruleUpdate.investigation_fields,
      immutable: existingRule.params.immutable,
      ruleSource: convertImmutableToRuleSource(existingRule.params.immutable),
      license: ruleUpdate.license,
      outputIndex: ruleUpdate.output_index ?? '',
      timelineId: ruleUpdate.timeline_id,
      timelineTitle: ruleUpdate.timeline_title,
      meta: ruleUpdate.meta,
      maxSignals: ruleUpdate.max_signals ?? DEFAULT_MAX_SIGNALS,
      relatedIntegrations: ruleUpdate.related_integrations ?? [],
      requiredFields: addEcsToRequiredFields(ruleUpdate.required_fields),
      riskScore: ruleUpdate.risk_score,
      riskScoreMapping: ruleUpdate.risk_score_mapping ?? [],
      ruleNameOverride: ruleUpdate.rule_name_override,
      setup: ruleUpdate.setup,
      severity: ruleUpdate.severity,
      severityMapping: ruleUpdate.severity_mapping ?? [],
      threat: ruleUpdate.threat ?? [],
      timestampOverride: ruleUpdate.timestamp_override,
      timestampOverrideFallbackDisabled: ruleUpdate.timestamp_override_fallback_disabled,
      to: ruleUpdate.to ?? 'now',
      references: ruleUpdate.references ?? [],
      namespace: ruleUpdate.namespace,
      note: ruleUpdate.note,
      version: ruleUpdate.version ?? existingRule.params.version,
      exceptionsList: ruleUpdate.exceptions_list ?? [],
      ...typeSpecificParams,
    },
    schedule: { interval: ruleUpdate.interval ?? '5m' },
    actions,
  };

  return newInternalRule;
};

// eslint-disable-next-line complexity
export const convertPatchAPIToInternalSchema = (
  nextParams: PatchRuleRequestBody,
  existingRule: SanitizedRule<RuleParams>
): InternalRuleUpdate => {
  const typeSpecificParams = patchTypeSpecificSnakeToCamel(nextParams, existingRule.params);
  const existingParams = existingRule.params;

  const alertActions =
    nextParams.actions?.map((action) => transformRuleToAlertAction(action)) ?? existingRule.actions;
  const throttle = nextParams.throttle ?? transformFromAlertThrottle(existingRule);
  const actions = transformToActionFrequency(alertActions, throttle);

  return {
    name: nextParams.name ?? existingRule.name,
    tags: nextParams.tags ?? existingRule.tags,
    params: {
      author: nextParams.author ?? existingParams.author,
      buildingBlockType: nextParams.building_block_type ?? existingParams.buildingBlockType,
      description: nextParams.description ?? existingParams.description,
      ruleId: existingParams.ruleId,
      falsePositives: nextParams.false_positives ?? existingParams.falsePositives,
      investigationFields: nextParams.investigation_fields ?? existingParams.investigationFields,
      from: nextParams.from ?? existingParams.from,
      immutable: existingParams.immutable,
      ruleSource: convertImmutableToRuleSource(existingParams.immutable),
      license: nextParams.license ?? existingParams.license,
      outputIndex: nextParams.output_index ?? existingParams.outputIndex,
      timelineId: nextParams.timeline_id ?? existingParams.timelineId,
      timelineTitle: nextParams.timeline_title ?? existingParams.timelineTitle,
      meta: nextParams.meta ?? existingParams.meta,
      maxSignals: nextParams.max_signals ?? existingParams.maxSignals,
      relatedIntegrations: nextParams.related_integrations ?? existingParams.relatedIntegrations,
      requiredFields: addEcsToRequiredFields(nextParams.required_fields),
      riskScore: nextParams.risk_score ?? existingParams.riskScore,
      riskScoreMapping: nextParams.risk_score_mapping ?? existingParams.riskScoreMapping,
      ruleNameOverride: nextParams.rule_name_override ?? existingParams.ruleNameOverride,
      setup: nextParams.setup ?? existingParams.setup,
      severity: nextParams.severity ?? existingParams.severity,
      severityMapping: nextParams.severity_mapping ?? existingParams.severityMapping,
      threat: nextParams.threat ?? existingParams.threat,
      timestampOverride: nextParams.timestamp_override ?? existingParams.timestampOverride,
      timestampOverrideFallbackDisabled:
        nextParams.timestamp_override_fallback_disabled ??
        existingParams.timestampOverrideFallbackDisabled,
      to: nextParams.to ?? existingParams.to,
      references: nextParams.references ?? existingParams.references,
      namespace: nextParams.namespace ?? existingParams.namespace,
      note: nextParams.note ?? existingParams.note,
      version: nextParams.version ?? existingParams.version,
      exceptionsList: nextParams.exceptions_list ?? existingParams.exceptionsList,
      ...typeSpecificParams,
    },
    schedule: { interval: nextParams.interval ?? existingRule.schedule.interval },
    actions,
  };
};

interface RuleCreateOptions {
  immutable?: boolean;
  defaultEnabled?: boolean;
}

// eslint-disable-next-line complexity
export const convertCreateAPIToInternalSchema = (
  input: RuleCreateProps,
  options?: RuleCreateOptions
): InternalRuleCreate => {
  const { immutable = false, defaultEnabled = true } = options ?? {};

  const typeSpecificParams = typeSpecificSnakeToCamel(input);
  const newRuleId = input.rule_id ?? uuidv4();

  const alertActions = input.actions?.map((action) => transformRuleToAlertAction(action)) ?? [];
  const actions = transformToActionFrequency(alertActions, input.throttle);

  return {
    name: input.name,
    tags: input.tags ?? [],
    alertTypeId: ruleTypeMappings[input.type],
    consumer: SERVER_APP_ID,
    params: {
      author: input.author ?? [],
      buildingBlockType: input.building_block_type,
      description: input.description,
      ruleId: newRuleId,
      falsePositives: input.false_positives ?? [],
      investigationFields: input.investigation_fields,
      from: input.from ?? DEFAULT_FROM,
      immutable,
      ruleSource: convertImmutableToRuleSource(immutable),
      license: input.license,
      outputIndex: input.output_index ?? '',
      timelineId: input.timeline_id,
      timelineTitle: input.timeline_title,
      meta: input.meta,
      maxSignals: input.max_signals ?? DEFAULT_MAX_SIGNALS,
      riskScore: input.risk_score,
      riskScoreMapping: input.risk_score_mapping ?? [],
      ruleNameOverride: input.rule_name_override,
      severity: input.severity,
      severityMapping: input.severity_mapping ?? [],
      threat: input.threat ?? [],
      timestampOverride: input.timestamp_override,
      timestampOverrideFallbackDisabled: input.timestamp_override_fallback_disabled,
      to: input.to ?? DEFAULT_TO,
      references: input.references ?? [],
      namespace: input.namespace,
      note: input.note,
      version: input.version ?? 1,
      exceptionsList: input.exceptions_list ?? [],
      relatedIntegrations: input.related_integrations ?? [],
      requiredFields: addEcsToRequiredFields(input.required_fields),
      setup: input.setup ?? '',
      ...typeSpecificParams,
    },
    schedule: { interval: input.interval ?? '5m' },
    enabled: input.enabled ?? defaultEnabled,
    actions,
  };
};

// Converts the internal rule data structure to the response API schema
export const typeSpecificCamelToSnake = (
  params: TypeSpecificRuleParams
): RequiredOptional<TypeSpecificResponse> => {
  switch (params.type) {
    case 'eql': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        data_view_id: params.dataViewId,
        query: params.query,
        filters: params.filters,
        timestamp_field: params.timestampField,
        event_category_override: params.eventCategoryOverride,
        tiebreaker_field: params.tiebreakerField,
        alert_suppression: convertAlertSuppressionToSnake(params.alertSuppression),
      };
    }
    case 'esql': {
      return {
        type: params.type,
        language: params.language,
        query: params.query,
        alert_suppression: convertAlertSuppressionToSnake(params.alertSuppression),
      };
    }
    case 'threat_match': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        data_view_id: params.dataViewId,
        query: params.query,
        filters: params.filters,
        saved_id: params.savedId,
        threat_filters: params.threatFilters,
        threat_query: params.threatQuery,
        threat_mapping: params.threatMapping,
        threat_language: params.threatLanguage,
        threat_index: params.threatIndex,
        threat_indicator_path: params.threatIndicatorPath,
        concurrent_searches: params.concurrentSearches,
        items_per_search: params.itemsPerSearch,
        alert_suppression: convertAlertSuppressionToSnake(params.alertSuppression),
      };
    }
    case 'query': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        data_view_id: params.dataViewId,
        query: params.query,
        filters: params.filters,
        saved_id: params.savedId,
        response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),
        alert_suppression: convertAlertSuppressionToSnake(params.alertSuppression),
      };
    }
    case 'saved_query': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        query: params.query,
        filters: params.filters,
        saved_id: params.savedId,
        data_view_id: params.dataViewId,
        response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),
        alert_suppression: convertAlertSuppressionToSnake(params.alertSuppression),
      };
    }
    case 'threshold': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        data_view_id: params.dataViewId,
        query: params.query,
        filters: params.filters,
        saved_id: params.savedId,
        threshold: params.threshold,
        alert_suppression: params.alertSuppression?.duration
          ? { duration: params.alertSuppression?.duration }
          : undefined,
      };
    }
    case 'machine_learning': {
      return {
        type: params.type,
        anomaly_threshold: params.anomalyThreshold,
        machine_learning_job_id: params.machineLearningJobId,
        alert_suppression: convertAlertSuppressionToSnake(params.alertSuppression),
      };
    }
    case 'new_terms': {
      return {
        type: params.type,
        query: params.query,
        new_terms_fields: params.newTermsFields,
        history_window_start: params.historyWindowStart,
        index: params.index,
        filters: params.filters,
        language: params.language,
        data_view_id: params.dataViewId,
        alert_suppression: convertAlertSuppressionToSnake(params.alertSuppression),
      };
    }
    default: {
      return assertUnreachable(params);
    }
  }
};

// TODO: separate out security solution defined common params from Alerting framework common params
// so we can explicitly specify the return type of this function
export const commonParamsCamelToSnake = (params: BaseRuleParams) => {
  return {
    description: params.description,
    risk_score: params.riskScore,
    severity: params.severity,
    building_block_type: params.buildingBlockType,
    namespace: params.namespace,
    note: params.note,
    license: params.license,
    output_index: params.outputIndex,
    timeline_id: params.timelineId,
    timeline_title: params.timelineTitle,
    meta: params.meta,
    rule_name_override: params.ruleNameOverride,
    timestamp_override: params.timestampOverride,
    timestamp_override_fallback_disabled: params.timestampOverrideFallbackDisabled,
    investigation_fields: migrateLegacyInvestigationFields(params.investigationFields),
    author: params.author,
    false_positives: params.falsePositives,
    from: params.from,
    rule_id: params.ruleId,
    max_signals: params.maxSignals,
    risk_score_mapping: params.riskScoreMapping,
    severity_mapping: params.severityMapping,
    threat: params.threat,
    to: params.to,
    references: params.references,
    version: params.version,
    exceptions_list: params.exceptionsList,
    immutable: params.immutable,
    rule_source: convertObjectKeysToSnakeCase(params.ruleSource),
    related_integrations: params.relatedIntegrations ?? [],
    required_fields: params.requiredFields ?? [],
    setup: params.setup ?? '',
  };
};

export const internalRuleToAPIResponse = (
  rule: SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams>
): RequiredOptional<RuleResponse> => {
  const executionSummary = createRuleExecutionSummary(rule);

  const isResolvedRule = (obj: unknown): obj is ResolvedSanitizedRule<RuleParams> =>
    (obj as ResolvedSanitizedRule<RuleParams>).outcome != null;

  const alertActions = rule.actions.map(transformAlertToRuleAction);
  const throttle = transformFromAlertThrottle(rule);
  const actions = transformToActionFrequency(alertActions, throttle);

  return {
    // saved object properties
    outcome: isResolvedRule(rule) ? rule.outcome : undefined,
    alias_target_id: isResolvedRule(rule) ? rule.alias_target_id : undefined,
    alias_purpose: isResolvedRule(rule) ? rule.alias_purpose : undefined,
    // Alerting framework params
    id: rule.id,
    updated_at: rule.updatedAt.toISOString(),
    updated_by: rule.updatedBy ?? 'elastic',
    created_at: rule.createdAt.toISOString(),
    created_by: rule.createdBy ?? 'elastic',
    name: rule.name,
    tags: rule.tags,
    interval: rule.schedule.interval,
    enabled: rule.enabled,
    revision: rule.revision,
    // Security solution shared rule params
    ...commonParamsCamelToSnake(rule.params),
    // Type specific security solution rule params
    ...typeSpecificCamelToSnake(rule.params),
    // Actions
    throttle: undefined,
    actions,
    // Execution summary
    execution_summary: executionSummary ?? undefined,
  };
};

export const convertPrebuiltRuleAssetToRuleResponse = (
  prebuiltRuleAsset: PrebuiltRuleAsset
): RuleResponse => {
  const prebuiltRuleAssetDefaults = {
    enabled: false,
    risk_score_mapping: [],
    severity_mapping: [],
    interval: DEFAULT_INTERVAL,
    to: DEFAULT_TO,
    from: DEFAULT_FROM,
    exceptions_list: [],
    false_positives: [],
    max_signals: DEFAULT_MAX_SIGNALS,
    actions: [],
    related_integrations: [],
    required_fields: [],
    setup: '',
    note: '',
    references: [],
    threat: [],
    tags: [],
    author: [],
  };

  const immutable = true;

  const ruleResponseSpecificFields = {
    id: uuidv4(),
    updated_at: new Date(0).toISOString(),
    updated_by: '',
    created_at: new Date(0).toISOString(),
    created_by: '',
    immutable,
    rule_source: convertObjectKeysToSnakeCase(convertImmutableToRuleSource(immutable)),
    revision: 1,
  };

  return RuleResponse.parse({
    ...prebuiltRuleAssetDefaults,
    ...prebuiltRuleAsset,
    required_fields: addEcsToRequiredFields(prebuiltRuleAsset.required_fields),
    ...ruleResponseSpecificFields,
  });
};

export const convertImmutableToRuleSource = (immutable: boolean): RuleSourceCamelCased => {
  if (immutable) {
    return {
      type: 'external',
      isCustomized: false,
    };
  }

  return {
    type: 'internal',
  };
};
