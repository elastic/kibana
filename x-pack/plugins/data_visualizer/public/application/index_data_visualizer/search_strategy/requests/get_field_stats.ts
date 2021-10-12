/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';
import { estypes } from '@elastic/elasticsearch';
import { FieldStats, isValidField } from '../../types/field_stats';
import { fetchDocumentCountStats } from './get_document_stats';
import { getNumericFieldStatsRequest } from './get_numeric_field_stats';
import { getStringFieldStatsRequest } from './get_string_field_stats';
import { getDateFieldStatsRequest } from './get_date_field_stats';
import { getBooleanFieldStatsRequest } from './get_boolean_field_stats';
import { getFieldExamplesRequest } from './get_field_examples';
import { JOB_FIELD_TYPES } from '../../../../../common';
import type { FieldStatsCommonRequestParams } from '../../../../../common/search_strategy/types';

export const getFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: {
    fieldName?: string;
    type: string;
    cardinality: number;
    safeFieldName: string;
  }
): Promise<estypes.SearchRequest | undefined> => {
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
        return getNumericFieldStatsRequest(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.KEYWORD:
        // case JOB_FIELD_TYPES.IP:
        return getStringFieldStatsRequest(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.DATE:
        return getDateFieldStatsRequest(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.BOOLEAN:
        return getBooleanFieldStatsRequest(esClient, params, field);
        break;
      case JOB_FIELD_TYPES.TEXT:
        return getFieldExamplesRequest(esClient, params, field);
        break;
      // @todo: fix field.fieldName &  move to keyword
      case JOB_FIELD_TYPES.IP:
        return getStringFieldStatsRequest(esClient, params, field.fieldName);
        break;
      // default:
      //   // Use an exists filter on the the field name to get
      //   // examples of the field, so cannot batch up.
      //   return getFieldExamplesRequest(esClient, params, field);
      //   break;
    }
  }
};
