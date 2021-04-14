/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { SavedObject } from 'kibana/server';
import { normalizeThresholdObject } from '../../../../common/detection_engine/utils';
import {
  InternalRuleCreate,
  RuleParams,
  TypeSpecificRuleParams,
  BaseRuleParams,
} from './rule_schemas';
import { assertUnreachable } from '../../../../common/utility_types';
import {
  CreateRulesSchema,
  CreateTypeSpecific,
  FullResponseSchema,
  ResponseTypeSpecific,
} from '../../../../common/detection_engine/schemas/request';
import { RuleActions } from '../rule_actions/types';
import { AppClient } from '../../../types';
import { addTags } from '../rules/add_tags';
import { DEFAULT_MAX_SIGNALS, SERVER_APP_ID, SIGNALS_ID } from '../../../../common/constants';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { Alert } from '../../../../../alerting/common';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';
import { transformTags } from '../routes/rules/utils';

// These functions provide conversions from the request API schema to the internal rule schema and from the internal rule schema
// to the response API schema. This provides static type-check assurances that the internal schema is in sync with the API schema for
// required and defaultable fields. However, it is still possible to add an optional field to the API schema
// without causing a type-check error here.

// Converts params from the snake case API format to the internal camel case format AND applies default values where needed.
// Notice that params.language is possibly undefined for most rule types in the API but we default it to kuery to match
// the legacy API behavior
export const typeSpecificSnakeToCamel = (params: CreateTypeSpecific): TypeSpecificRuleParams => {
  switch (params.type) {
    case 'eql': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        query: params.query,
        filters: params.filters,
        eventCategoryOverride: params.event_category_override,
      };
    }
    case 'threat_match': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        query: params.query,
        filters: params.filters,
        savedId: params.saved_id,
        threatFilters: params.threat_filters,
        threatQuery: params.threat_query,
        threatMapping: params.threat_mapping,
        threatLanguage: params.threat_language,
        threatIndex: params.threat_index,
        threatIndicatorPath: params.threat_indicator_path,
        concurrentSearches: params.concurrent_searches,
        itemsPerSearch: params.items_per_search,
      };
    }
    case 'query': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        query: params.query ?? '',
        filters: params.filters,
        savedId: params.saved_id,
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
      };
    }
    case 'threshold': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        query: params.query,
        filters: params.filters,
        savedId: params.saved_id,
        threshold: normalizeThresholdObject(params.threshold),
      };
    }
    case 'machine_learning': {
      return {
        type: params.type,
        anomalyThreshold: params.anomaly_threshold,
        machineLearningJobId: params.machine_learning_job_id,
      };
    }
    default: {
      return assertUnreachable(params);
    }
  }
};

export const convertCreateAPIToInternalSchema = (
  input: CreateRulesSchema,
  siemClient: AppClient
): InternalRuleCreate => {
  const typeSpecificParams = typeSpecificSnakeToCamel(input);
  const newRuleId = input.rule_id ?? uuid.v4();
  return {
    name: input.name,
    tags: addTags(input.tags ?? [], newRuleId, false),
    alertTypeId: SIGNALS_ID,
    consumer: SERVER_APP_ID,
    params: {
      author: input.author ?? [],
      buildingBlockType: input.building_block_type,
      description: input.description,
      ruleId: newRuleId,
      falsePositives: input.false_positives ?? [],
      from: input.from ?? 'now-6m',
      immutable: false,
      license: input.license,
      outputIndex: input.output_index ?? siemClient.getSignalsIndex(),
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
      to: input.to ?? 'now',
      references: input.references ?? [],
      note: input.note,
      version: input.version ?? 1,
      exceptionsList: input.exceptions_list ?? [],
      ...typeSpecificParams,
    },
    schedule: { interval: input.interval ?? '5m' },
    enabled: input.enabled ?? true,
    actions: input.throttle === 'rule' ? (input.actions ?? []).map(transformRuleToAlertAction) : [],
    throttle: null,
    notifyWhen: null,
  };
};

// Converts the internal rule data structure to the response API schema
export const typeSpecificCamelToSnake = (params: TypeSpecificRuleParams): ResponseTypeSpecific => {
  switch (params.type) {
    case 'eql': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        query: params.query,
        filters: params.filters,
        event_category_override: params.eventCategoryOverride,
      };
    }
    case 'threat_match': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
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
      };
    }
    case 'query': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        query: params.query,
        filters: params.filters,
        saved_id: params.savedId,
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
      };
    }
    case 'threshold': {
      return {
        type: params.type,
        language: params.language,
        index: params.index,
        query: params.query,
        filters: params.filters,
        saved_id: params.savedId,
        threshold: params.threshold,
      };
    }
    case 'machine_learning': {
      return {
        type: params.type,
        anomaly_threshold: params.anomalyThreshold,
        machine_learning_job_id: params.machineLearningJobId,
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
    note: params.note,
    license: params.license,
    output_index: params.outputIndex,
    timeline_id: params.timelineId,
    timeline_title: params.timelineTitle,
    meta: params.meta,
    rule_name_override: params.ruleNameOverride,
    timestamp_override: params.timestampOverride,
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
  };
};

export const internalRuleToAPIResponse = (
  rule: Alert<RuleParams>,
  ruleActions?: RuleActions | null,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): FullResponseSchema => {
  return {
    // Alerting framework params
    id: rule.id,
    updated_at: rule.updatedAt.toISOString(),
    updated_by: rule.updatedBy ?? 'elastic',
    created_at: rule.createdAt.toISOString(),
    created_by: rule.createdBy ?? 'elastic',
    name: rule.name,
    tags: transformTags(rule.tags),
    interval: rule.schedule.interval,
    enabled: rule.enabled,
    // Security solution shared rule params
    ...commonParamsCamelToSnake(rule.params),
    // Type specific security solution rule params
    ...typeSpecificCamelToSnake(rule.params),
    // Actions
    throttle: ruleActions?.ruleThrottle || 'no_actions',
    actions: ruleActions?.actions ?? [],
    // Rule status
    status: ruleStatus?.attributes.status ?? undefined,
    status_date: ruleStatus?.attributes.statusDate ?? undefined,
    last_failure_at: ruleStatus?.attributes.lastFailureAt ?? undefined,
    last_success_at: ruleStatus?.attributes.lastSuccessAt ?? undefined,
    last_failure_message: ruleStatus?.attributes.lastFailureMessage ?? undefined,
    last_success_message: ruleStatus?.attributes.lastSuccessMessage ?? undefined,
  };
};
