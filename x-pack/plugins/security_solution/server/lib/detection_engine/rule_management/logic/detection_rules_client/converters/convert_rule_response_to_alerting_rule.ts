/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateRuleData } from '@kbn/alerting-plugin/server/application/rule/methods/update';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RuleActionCamel } from '@kbn/securitysolution-io-ts-alerting-types';

import { addEcsToRequiredFields } from '../../../../../../../common/detection_engine/rule_management/utils';
import type {
  RuleResponse,
  TypeSpecificCreateProps,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import {
  transformRuleToAlertAction,
  transformRuleToAlertResponseAction,
} from '../../../../../../../common/detection_engine/transform_actions';
import {
  normalizeMachineLearningJobIds,
  normalizeThresholdObject,
} from '../../../../../../../common/detection_engine/utils';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { convertObjectKeysToCamelCase } from '../../../../../../utils/object_case_converters';
import type { RuleParams, TypeSpecificRuleParams } from '../../../../rule_schema';
import { transformToActionFrequency } from '../../../normalization/rule_actions';
import { separateActionsAndSystemAction } from '../../../utils/utils';

/**
 * These are the fields that are added to the rule response that are not part of the rule params
 */
type RuntimeFields =
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'created_by'
  | 'updated_by'
  | 'revision'
  | 'execution_summary';

export const convertRuleResponseToAlertingRule = (
  rule: Omit<RuleResponse, RuntimeFields>,
  actionsClient: ActionsClient
): UpdateRuleData<RuleParams> => {
  const [ruleSystemActions, ruleActions] = separateActionsAndSystemAction(
    actionsClient,
    rule.actions
  );
  const systemActions = ruleSystemActions?.map((action) => transformRuleToAlertAction(action));

  const alertActions = ruleActions?.map((action) => transformRuleToAlertAction(action)) ?? [];
  const actions = transformToActionFrequency(alertActions as RuleActionCamel[], rule.throttle);

  const responseActions = rule.response_actions?.map((ruleResponseAction) =>
    transformRuleToAlertResponseAction(ruleResponseAction)
  );
  // Because of Omit<RuleResponse, RuntimeFields> Typescript doesn't recognize
  // that rule is assignable to TypeSpecificCreateProps despite omitted fields
  // are not part of type specific props. So we need to cast here.
  const typeSpecificParams = typeSpecificSnakeToCamel(rule as TypeSpecificCreateProps);

  return {
    name: rule.name,
    tags: rule.tags,
    params: {
      author: rule.author,
      buildingBlockType: rule.building_block_type,
      description: rule.description,
      ruleId: rule.rule_id,
      falsePositives: rule.false_positives,
      from: rule.from,
      investigationFields: rule.investigation_fields,
      immutable: rule.immutable,
      ruleSource: rule.rule_source ? convertObjectKeysToCamelCase(rule.rule_source) : undefined,
      license: rule.license,
      outputIndex: rule.output_index ?? '',
      timelineId: rule.timeline_id,
      timelineTitle: rule.timeline_title,
      meta: rule.meta,
      maxSignals: rule.max_signals,
      relatedIntegrations: rule.related_integrations,
      requiredFields: addEcsToRequiredFields(rule.required_fields),
      riskScore: rule.risk_score,
      riskScoreMapping: rule.risk_score_mapping,
      ruleNameOverride: rule.rule_name_override,
      setup: rule.setup,
      severity: rule.severity,
      severityMapping: rule.severity_mapping,
      threat: rule.threat,
      timestampOverride: rule.timestamp_override,
      timestampOverrideFallbackDisabled: rule.timestamp_override_fallback_disabled,
      to: rule.to,
      references: rule.references,
      namespace: rule.namespace,
      note: rule.note,
      version: rule.version,
      exceptionsList: rule.exceptions_list,
      responseActions,
      ...typeSpecificParams,
    },
    schedule: { interval: rule.interval },
    actions,
    ...(systemActions && { systemActions }),
  };
};

// Converts params from the snake case API format to the internal camel case format AND applies default values where needed.
// Notice that params.language is possibly undefined for most rule types in the API but we default it to kuery to match
// the legacy API behavior
const typeSpecificSnakeToCamel = (params: TypeSpecificCreateProps): TypeSpecificRuleParams => {
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
        alertSuppression: params.alert_suppression
          ? convertObjectKeysToCamelCase(params.alert_suppression)
          : undefined,
      };
    }
    case 'esql': {
      return {
        type: params.type,
        language: params.language,
        query: params.query,
        alertSuppression: params.alert_suppression
          ? convertObjectKeysToCamelCase(params.alert_suppression)
          : undefined,
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
        threatIndicatorPath: params.threat_indicator_path,
        concurrentSearches: params.concurrent_searches,
        itemsPerSearch: params.items_per_search,
        alertSuppression: params.alert_suppression
          ? convertObjectKeysToCamelCase(params.alert_suppression)
          : undefined,
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
        alertSuppression: params.alert_suppression
          ? convertObjectKeysToCamelCase(params.alert_suppression)
          : undefined,
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
        alertSuppression: params.alert_suppression
          ? convertObjectKeysToCamelCase(params.alert_suppression)
          : undefined,
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
        alertSuppression: params.alert_suppression
          ? convertObjectKeysToCamelCase(params.alert_suppression)
          : undefined,
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
        alertSuppression: params.alert_suppression
          ? convertObjectKeysToCamelCase(params.alert_suppression)
          : undefined,
      };
    }
    default: {
      return assertUnreachable(params);
    }
  }
};
