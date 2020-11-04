/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeSpecificRuleParams } from './rule_schemas';
import { assertUnreachable } from '../../../../common/utility_types';
import { CreateUpdateTypeSpecific } from '../../../../common/detection_engine/schemas/request/rule_schemas';

export const typeSpecificSnakeToCamel = (
  params: CreateUpdateTypeSpecific
): TypeSpecificRuleParams => {
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
      };
    }
    case 'query': {
      return {
        type: params.type,
        language: params.language ?? 'kuery',
        index: params.index,
        query: params.query,
        filters: params.filters,
        savedId: params.saved_id,
      };
    }
    case 'saved_query': {
      return {
        type: params.type,
        language: params.language,
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
