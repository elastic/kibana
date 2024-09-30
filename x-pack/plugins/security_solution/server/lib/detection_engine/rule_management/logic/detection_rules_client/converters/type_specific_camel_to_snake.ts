/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredOptional } from '@kbn/zod-helpers';
import { transformAlertToRuleResponseAction } from '../../../../../../../common/detection_engine/transform_actions';
import type { TypeSpecificResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { convertObjectKeysToSnakeCase } from '../../../../../../utils/object_case_converters';
import type { TypeSpecificRuleParams } from '../../../../rule_schema';

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
        alert_suppression: convertObjectKeysToSnakeCase(params.alertSuppression),
        response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),
      };
    }
    case 'esql': {
      return {
        type: params.type,
        language: params.language,
        query: params.query,
        alert_suppression: convertObjectKeysToSnakeCase(params.alertSuppression),
        response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),
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
        alert_suppression: convertObjectKeysToSnakeCase(params.alertSuppression),
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
        alert_suppression: convertObjectKeysToSnakeCase(params.alertSuppression),
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
        alert_suppression: convertObjectKeysToSnakeCase(params.alertSuppression),
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
        alert_suppression: convertObjectKeysToSnakeCase(params.alertSuppression),
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
        alert_suppression: convertObjectKeysToSnakeCase(params.alertSuppression),
        response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),
      };
    }
    default: {
      return assertUnreachable(params);
    }
  }
};
