/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chunk } from 'lodash';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../../common/correlations/types';
import { FieldStats } from '../../../../../common/correlations/field_stats_types';
import { fetchKeywordFieldStats } from './fetch_keyword_field_stats';
import { fetchNumericFieldStats } from './fetch_numeric_field_stats';
import { fetchBooleanFieldStats } from './fetch_boolean_field_stats';
import { Setup } from '../../../../lib/helpers/setup_request';

export const fetchFieldsStats = async ({
  setup,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  fieldsToSample,
}: CommonCorrelationsQueryParams & {
  eventType: ProcessorEvent;
  setup: Setup;
  fieldsToSample: string[];
}): Promise<{
  stats: FieldStats[];
  errors: any[];
}> => {
  const { apmEventClient } = setup;
  const stats: FieldStats[] = [];
  const errors: any[] = [];

  if (fieldsToSample.length === 0) return { stats, errors };

  const respMapping = await apmEventClient.fieldCaps(
    'get_field_caps_for_field_stats',
    {
      apm: {
        events: [eventType],
      },
      body: {
        index_filter: {
          bool: {
            filter: [...rangeQuery(start, end)],
          },
        },
      },
      fields: fieldsToSample,
    }
  );

  const fieldStatsPromises = Object.entries(respMapping.fields)
    .map(([key, value], idx) => {
      const field: FieldValuePair = { fieldName: key, fieldValue: '' };
      const fieldTypes = Object.keys(value);

      for (const ft of fieldTypes) {
        switch (ft) {
          case ES_FIELD_TYPES.KEYWORD:
          case ES_FIELD_TYPES.IP:
            return fetchKeywordFieldStats({
              setup,
              eventType,
              start,
              end,
              environment,
              kuery,
              query,
              field,
            });
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
            return fetchNumericFieldStats({
              setup,
              eventType,
              start,
              end,
              environment,
              kuery,
              query,
              field,
            });

            break;
          case ES_FIELD_TYPES.BOOLEAN:
            return fetchBooleanFieldStats({
              setup,
              eventType,
              start,
              end,
              environment,
              kuery,
              query,
              field,
            });

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
