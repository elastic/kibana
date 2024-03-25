/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import pLimit from 'p-limit';
import { chunk } from 'lodash';
import { isDefined } from '@kbn/ml-is-defined';
import type { ESQLSearchReponse } from '@kbn/es-types';
import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { getSafeESQLName } from '../requests/esql_utils';
import { MAX_CONCURRENT_REQUESTS } from '../../constants/index_data_visualizer_viewer';
import type { NonAggregatableField } from '../../types/overall_stats';
import { isFulfilled } from '../../../common/util/promise_all_settled_utils';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import type { AggregatableField } from '../../types/esql_data_visualizer';
import type { HandleErrorCallback } from './handle_error';
import { handleError } from './handle_error';

interface Field extends Column {
  aggregatable?: boolean;
}
const getESQLOverallStatsInChunk = async ({
  runRequest,
  fields,
  esqlBaseQueryWithLimit,
  filter,
  limitSize,
  totalCount,
  onError,
}: {
  runRequest: UseCancellableSearch['runRequest'];
  fields: Field[];
  esqlBaseQueryWithLimit: string;
  filter?: estypes.QueryDslQueryContainer;
  limitSize: number;
  totalCount: number;
  onError?: HandleErrorCallback;
}) => {
  if (fields.length > 0) {
    const aggToIndex = { count: 0, cardinality: 1 };
    // Track what's the starting index for the next field
    // For aggregatable field, we are getting count(EVAL MV_MIN()) and count_disticnt
    // For non-aggregatable field, we are getting only count()
    let startIndex = 0;
    /** Example query:
     * from {indexPattern} | LIMIT {limitSize}
     * | EVAL  `ne_{aggregableField}` = MV_MIN({aggregableField}),
     * | STATs `{aggregableField}_count` = COUNT(`ne_{aggregableField}`),
     * `{aggregableField}_cardinality` = COUNT_DISTINCT({aggregableField}),
     * `{nonAggregableField}_count` = COUNT({nonAggregableField})
     */
    const fieldsToFetch: Array<Field & { evalQuery?: string; query: string; startIndex: number }> =
      fields.map((field) => {
        if (field.aggregatable) {
          const result = {
            ...field,
            startIndex,
            // Field values can be an array of values (fieldName = ['a', 'b', 'c'])
            // and count(fieldName) will count all the field values in the array
            // Ex: for 2 docs, count(fieldName) might return 5
            // So we need to do count(EVAL(MV_MIN(fieldName))) instead
            // to get accurate % of rows where field value exists
            evalQuery: `${getSafeESQLName(`ne_${field.name}`)} = MV_MIN(${getSafeESQLName(
              `${field.name}`
            )})`,
            query: `${getSafeESQLName(`${field.name}_count`)} = COUNT(${getSafeESQLName(
              `ne_${field.name}`
            )}),
        ${getSafeESQLName(`${field.name}_cardinality`)} = COUNT_DISTINCT(${getSafeESQLName(
              field.name
            )})`,
          };
          // +2 for count, and count_dictinct
          startIndex += 2;
          return result;
        } else {
          const result = {
            ...field,
            startIndex,
            query: `${getSafeESQLName(`${field.name}_count`)} = COUNT(${getSafeESQLName(
              field.name
            )})`,
          };
          // +1 for count for non-aggregatable field
          startIndex += 1;
          return result;
        }
      });

    const evalQuery = fieldsToFetch
      .map((field) => field.evalQuery)
      .filter(isDefined)
      .join(',');

    let countQuery = fieldsToFetch.length > 0 ? '| STATS ' : '';
    countQuery += fieldsToFetch.map((field) => field.query).join(',');

    const query = esqlBaseQueryWithLimit + (evalQuery ? ' | EVAL ' + evalQuery : '') + countQuery;
    const request = {
      params: {
        query,
        ...(filter ? { filter } : {}),
      },
    };

    try {
      const esqlResults = await runRequest(request, { strategy: ESQL_SEARCH_STRATEGY });
      const stats = {
        aggregatableExistsFields: [] as AggregatableField[],
        aggregatableNotExistsFields: [] as AggregatableField[],
        nonAggregatableExistsFields: [] as NonAggregatableField[],
        nonAggregatableNotExistsFields: [] as NonAggregatableField[],
      };

      if (!esqlResults) {
        return;
      }
      const esqlResultsResp = esqlResults.rawResponse as unknown as ESQLSearchReponse;

      const sampleCount = !isDefined(limitSize) ? totalCount : limitSize;
      fieldsToFetch.forEach((field, idx) => {
        const count = esqlResultsResp.values[0][field.startIndex + aggToIndex.count] as number;

        if (field.aggregatable === true) {
          const cardinality = esqlResultsResp.values[0][
            field.startIndex + aggToIndex.cardinality
          ] as number;

          if (count > 0) {
            stats.aggregatableExistsFields.push({
              ...field,
              fieldName: field.name,
              existsInDocs: true,
              stats: {
                sampleCount,
                count,
                cardinality,
              },
            });
          } else {
            stats.aggregatableNotExistsFields.push({
              ...field,
              fieldName: field.name,
              existsInDocs: false,
              stats: undefined,
            });
          }
        } else {
          if (count > 0) {
            stats.nonAggregatableExistsFields.push({
              fieldName: field.name,
              existsInDocs: true,
              stats: {
                sampleCount,
                count,
              },
            });
          } else {
            stats.nonAggregatableNotExistsFields.push({
              fieldName: field.name,
              existsInDocs: false,
            });
          }
        }
      });
      return stats;
    } catch (error) {
      handleError({
        error,
        request,
        onError,
        title: i18n.translate('xpack.dataVisualizer.esql.countAndCardinalityError', {
          defaultMessage:
            'Unable to fetch count & cardinality for {count} {count, plural, one {field} other {fields}}: {fieldNames}',
          values: {
            count: fieldsToFetch.length,
            fieldNames: fieldsToFetch.map((r) => r.name).join(),
          },
        }),
      });
      return Promise.reject(error);
    }
  }
};

/**
 * Fetching count and cardinality in chunks of 30 fields per request in parallel
 * limiting at 10 requests maximum at a time
 * @param runRequest
 * @param fields
 * @param esqlBaseQueryWithLimit
 */
export const getESQLOverallStats = async ({
  runRequest,
  fields,
  esqlBaseQueryWithLimit,
  filter,
  limitSize,
  totalCount,
  onError,
}: {
  runRequest: UseCancellableSearch['runRequest'];
  fields: Column[];
  esqlBaseQueryWithLimit: string;
  filter?: estypes.QueryDslQueryContainer;
  limitSize: number;
  totalCount: number;
  onError?: HandleErrorCallback;
}) => {
  const limiter = pLimit(MAX_CONCURRENT_REQUESTS);

  const chunkedFields = chunk(fields, 30);

  const resp = await Promise.allSettled(
    chunkedFields.map((groupedFields, idx) =>
      limiter(() =>
        getESQLOverallStatsInChunk({
          runRequest,
          fields: groupedFields,
          esqlBaseQueryWithLimit,
          limitSize,
          filter,
          totalCount,
          onError,
        })
      )
    )
  );
  const results = resp.filter(isFulfilled).map((r) => r.value);

  const stats = results.reduce(
    (acc, result) => {
      if (acc && result) {
        acc.aggregatableExistsFields.push(...result.aggregatableExistsFields);
        acc.aggregatableNotExistsFields.push(...result.aggregatableNotExistsFields);
        acc.nonAggregatableExistsFields.push(...result.nonAggregatableExistsFields);
        acc.nonAggregatableNotExistsFields.push(...result.nonAggregatableNotExistsFields);
      }
      return acc;
    },
    {
      aggregatableExistsFields: [] as AggregatableField[],
      aggregatableNotExistsFields: [] as AggregatableField[],
      nonAggregatableExistsFields: [] as NonAggregatableField[],
      nonAggregatableNotExistsFields: [] as NonAggregatableField[],
    }
  );

  return stats;
};
