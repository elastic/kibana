/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { chunk } from 'lodash';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { FieldValuePair } from '../../../../../common/correlations/types';
import {
  FieldStats,
  FieldStatsCommonRequestParams,
} from '../../../../../common/correlations/field_stats_types';
import { getRequestBase } from '../get_request_base';
import { fetchKeywordFieldStats } from './get_keyword_field_stats';
import { fetchNumericFieldStats } from './get_numeric_field_stats';
import { fetchBooleanFieldStats } from './get_boolean_field_stats';

export const fetchFieldsStats = async (
  esClient: ElasticsearchClient,
  fieldStatsParams: FieldStatsCommonRequestParams,
  fieldsToSample: string[],
  termFilters?: FieldValuePair[]
): Promise<{ stats: FieldStats[]; errors: any[] }> => {
  const stats: FieldStats[] = [];
  const errors: any[] = [];

  if (fieldsToSample.length === 0) return { stats, errors };

  const respMapping = await esClient.fieldCaps({
    ...getRequestBase(fieldStatsParams),
    fields: fieldsToSample,
  });

  const fieldStatsPromises = Object.entries(respMapping.fields)
    .map(([key, value], idx) => {
      const field: FieldValuePair = { fieldName: key, fieldValue: '' };
      const fieldTypes = Object.keys(value);

      for (const ft of fieldTypes) {
        switch (ft) {
          case ES_FIELD_TYPES.KEYWORD:
          case ES_FIELD_TYPES.IP:
            return fetchKeywordFieldStats(
              esClient,
              fieldStatsParams,
              field,
              termFilters
            );
            break;

          case 'numeric':
          case 'number':
          case ES_FIELD_TYPES.FLOAT:
          case ES_FIELD_TYPES.HALF_FLOAT:
          case ES_FIELD_TYPES.SCALED_FLOAT:
          case ES_FIELD_TYPES.DOUBLE:
          case ES_FIELD_TYPES.INTEGER:
          case ES_FIELD_TYPES.LONG:
          case ES_FIELD_TYPES.SHORT:
          case ES_FIELD_TYPES.UNSIGNED_LONG:
          case ES_FIELD_TYPES.BYTE:
            return fetchNumericFieldStats(
              esClient,
              fieldStatsParams,
              field,
              termFilters
            );

            break;
          case ES_FIELD_TYPES.BOOLEAN:
            return fetchBooleanFieldStats(
              esClient,
              fieldStatsParams,
              field,
              termFilters
            );

          default:
            return;
        }
      }
    })
    .filter((f) => f !== undefined) as Array<Promise<FieldStats>>;

  const batches = chunk(fieldStatsPromises, 10);
  for (let i = 0; i < batches.length; i++) {
    try {
      const results = await Promise.allSettled(batches[i]);
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value !== undefined) {
          stats.push(r.value);
        }
      });
    } catch (e) {
      errors.push(e);
    }
  }

  return { stats, errors };
};
