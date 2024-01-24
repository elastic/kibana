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
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getSafeESQLName } from '../requests/esql_utils';
import { MAX_CONCURRENT_REQUESTS } from '../../constants/index_data_visualizer_viewer';
import type { AggregatableField } from '../../hooks/esql/use_esql_field_stats_data';
import type { NonAggregatableField } from '../../types/overall_stats';
import { isFulfilled } from '../../../common/util/promise_all_settled_utils';
import type { ESQLDefaultLimitSizeOption } from '../../components/search_panel/esql/limit_size';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';

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
}: {
  runRequest: UseCancellableSearch['runRequest'];
  fields: Field[];
  esqlBaseQueryWithLimit: string;
  filter?: estypes.QueryDslQueryContainer;
  limitSize?: ESQLDefaultLimitSizeOption;
  totalCount: number;
}) => {
  if (fields.length > 0) {
    const aggregatableFieldsToQuery = fields.filter((f) => f.aggregatable);

    let countQuery = aggregatableFieldsToQuery.length > 0 ? '| STATS ' : '';
    countQuery += aggregatableFieldsToQuery
      .map((field) => {
        // count idx = 0, cardinality idx = 1
        return `${getSafeESQLName(`${field.name}_count`)} = COUNT(${getSafeESQLName(field.name)}),
        ${getSafeESQLName(`${field.name}_cardinality`)} = COUNT_DISTINCT(${getSafeESQLName(
          field.name
        )})`;
      })
      .join(',');

    const esqlResults = await runRequest(
      {
        params: {
          query: esqlBaseQueryWithLimit + countQuery,
          ...(filter ? { filter } : {}),
        },
      },
      { strategy: ESQL_SEARCH_STRATEGY }
    );
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

    const sampleCount =
      limitSize === 'none' || !isDefined(limitSize) ? totalCount : parseInt(limitSize, 10);
    aggregatableFieldsToQuery.forEach((field, idx) => {
      const count = esqlResultsResp.values[0][idx * 2] as number;
      const cardinality = esqlResultsResp.values[0][idx * 2 + 1] as number;

      if (field.aggregatable === true) {
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
        const fieldData = {
          fieldName: field.name,
          existsInDocs: true,
        };
        if (count > 0) {
          stats.nonAggregatableExistsFields.push(fieldData);
        } else {
          stats.nonAggregatableNotExistsFields.push(fieldData);
        }
      }
    });
    return stats;
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
}: {
  runRequest: UseCancellableSearch['runRequest'];
  fields: Column[];
  esqlBaseQueryWithLimit: string;
  filter?: estypes.QueryDslQueryContainer;
  limitSize?: ESQLDefaultLimitSizeOption;
  totalCount: number;
}) => {
  const limiter = pLimit(MAX_CONCURRENT_REQUESTS);

  const chunkedFields = chunk(fields, 30);

  const resp = await Promise.allSettled(
    chunkedFields.map((groupedFields) =>
      limiter(() =>
        getESQLOverallStatsInChunk({
          runRequest,
          fields: groupedFields,
          esqlBaseQueryWithLimit,
          limitSize,
          filter,
          totalCount,
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
