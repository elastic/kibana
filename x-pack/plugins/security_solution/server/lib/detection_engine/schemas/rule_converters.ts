/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { InternalRuleCreate, InternalRuleResponse, TypeSpecificRuleParams } from './rule_schemas';
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
        threshold: params.threshold,
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

export const internalRuleToAPIResponse = (
  rule: InternalRuleResponse,
  ruleActions: RuleActions
): FullResponseSchema => {
  return {
    id: rule.id,
    immutable: rule.params.immutable,
    updated_at: rule.updatedAt,
    updated_by: rule.updatedBy,
    created_at: rule.createdAt,
    created_by: rule.createdBy,
    name: rule.name,
    tags: rule.tags,
    interval: rule.schedule.interval,
    enabled: rule.enabled,
    throttle: ruleActions.ruleThrottle,
    actions: ruleActions.actions,
    description: rule.params.description,
    risk_score: rule.params.riskScore,
    severity: rule.params.severity,
    building_block_type: rule.params.buildingBlockType,
    note: rule.params.note,
    license: rule.params.license,
    output_index: rule.params.outputIndex,
    timeline_id: rule.params.timelineId,
    timeline_title: rule.params.timelineTitle,
    meta: rule.params.meta,
    rule_name_override: rule.params.ruleNameOverride,
    timestamp_override: rule.params.timestampOverride,
    author: rule.params.author ?? [],
    false_positives: rule.params.falsePositives,
    from: rule.params.from,
    rule_id: rule.params.ruleId,
    max_signals: rule.params.maxSignals,
    risk_score_mapping: rule.params.riskScoreMapping ?? [],
    severity_mapping: rule.params.severityMapping ?? [],
    threat: rule.params.threat,
    to: rule.params.to,
    references: rule.params.references,
    version: rule.params.version,
    exceptions_list: rule.params.exceptionsList ?? [],
    ...typeSpecificCamelToSnake(rule.params),
  };
};
