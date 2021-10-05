/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { JOB_FIELD_TYPES } from '../../../common';
import {
  FieldStatsCommonRequestParams,
  FieldStatsSearchStrategyParams,
} from '../../../common/search_strategy/types';
import { FieldStats, isValidField } from '../../types';
import { fetchDocumentCountStats } from './get_document_stats';
import { fetchNumericFieldStats } from './get_numeric_field_stats';
import { fetchStringFieldStats } from './get_string_field_stats';
import { fetchDateFieldStats } from './get_date_field_stats';
import { fetchBooleanFieldStats } from './get_boolean_field_stats';
import { fetchFieldExamples } from './get_field_examples';

export const getFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: {
    fieldName?: string;
    type: string;
    cardinality: number;
    safeFieldName: string;
  }
): Promise<FieldStats | undefined> => {
  // An invalid field with undefined fieldName is used for a document count request.
  if (!isValidField(field)) {
    // @todo
    // Will only ever be one document count card,
    // so no value in batching up the single request.
    if (field.type === JOB_FIELD_TYPES.NUMBER && params.intervalMs !== undefined) {
      // return fetchDocumentCountStats(esClient, params);
    }
  } else {
    switch (field.type) {
      case JOB_FIELD_TYPES.NUMBER:
        return fetchNumericFieldStats(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.KEYWORD:
        // case JOB_FIELD_TYPES.IP:
        return fetchStringFieldStats(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.DATE:
        return fetchDateFieldStats(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.BOOLEAN:
        return fetchBooleanFieldStats(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.TEXT:
        return fetchFieldExamples(esClient, params, field);
        break;
      // @todo: fix field.fieldName &  move to keyword
      case JOB_FIELD_TYPES.IP:
        return fetchStringFieldStats(esClient, params, field.fieldName);
        break;
      // default:
      //   // Use an exists filter on the the field name to get
      //   // examples of the field, so cannot batch up.
      //   return fetchFieldExamples(esClient, params, field);
      //   break;
    }
  }
};
