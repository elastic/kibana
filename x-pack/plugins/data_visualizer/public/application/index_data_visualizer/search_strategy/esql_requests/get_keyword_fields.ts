/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import pLimit from 'p-limit';
import { ESQL_LATEST_VERSION, appendToESQLQuery } from '@kbn/esql-utils';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import { getSafeESQLName } from '../requests/esql_utils';
import { isFulfilled, isRejected } from '../../../common/util/promise_all_settled_utils';
import { MAX_CONCURRENT_REQUESTS } from '../../constants/index_data_visualizer_viewer';
import type { BucketCount, BucketTerm } from '../../types/esql_data_visualizer';
import type { FieldStatsError, StringFieldStats } from '../../../../../common/types/field_stats';

interface Params {
  runRequest: UseCancellableSearch['runRequest'];
  columns: Column[];
  esqlBaseQuery: string;
  filter?: QueryDslQueryContainer;
}
export const getESQLKeywordFieldStats = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
}: Params) => {
  const limiter = pLimit(MAX_CONCURRENT_REQUESTS);

  const keywordFields = columns.map((field) => {
    const query = appendToESQLQuery(
      esqlBaseQuery,
      `| STATS ${getSafeESQLName(`${field.name}_in_records`)} = count(MV_MIN(${getSafeESQLName(
        field.name
      )})), ${getSafeESQLName(`${field.name}_in_values`)} = count(${getSafeESQLName(field.name)})
    BY ${getSafeESQLName(field.name)}
  | SORT ${getSafeESQLName(`${field.name}_in_records`)} DESC
  | LIMIT 10`
    );
    return {
      field,
      request: {
        params: {
          query,
          ...(filter ? { filter } : {}),
          version: ESQL_LATEST_VERSION,
        },
      },
    };
  });

  if (keywordFields.length > 0) {
    const keywordTopTermsResp = await Promise.allSettled(
      keywordFields.map(({ request }) =>
        limiter(() => runRequest(request, { strategy: ESQL_SEARCH_STRATEGY }))
      )
    );
    if (keywordTopTermsResp) {
      return keywordFields.map(({ field, request }, idx) => {
        const resp = keywordTopTermsResp[idx];
        if (!resp) return;

        if (isFulfilled(resp)) {
          const results = resp.value?.rawResponse?.values as Array<
            [BucketCount, BucketCount, BucketTerm]
          >;

          if (results) {
            const topValuesSampleSize = results.reduce((acc, row) => {
              return row[1] + acc;
            }, 0);

            const sampledValues = results.map((row) => ({
              key: row[2],
              doc_count: row[1],
            }));

            const terms = results.map((row) => ({
              key: row[2],
              doc_count: row[0],
            }));

            return {
              fieldName: field.name,
              topValues: terms,
              sampledValues,
              isTopValuesSampled: true,
              topValuesSampleSize,
            } as StringFieldStats;
          }
          return;
        }

        if (isRejected(resp)) {
          // Log for debugging purposes
          // eslint-disable-next-line no-console
          console.error(resp, request);

          return {
            fieldName: field.name,
            error: resp.reason,
          } as FieldStatsError;
        }
      });
    }
  }
  return [];
};
