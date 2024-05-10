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
import type { BucketCount } from '../../types/esql_data_visualizer';
import type { BooleanFieldStats, FieldStatsError } from '../../../../../common/types/field_stats';

interface Params {
  runRequest: UseCancellableSearch['runRequest'];
  columns: Column[];
  esqlBaseQuery: string;
  filter?: QueryDslQueryContainer;
}

export const getESQLBooleanFieldStats = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
}: Params): Promise<Array<BooleanFieldStats | FieldStatsError | undefined>> => {
  const limiter = pLimit(MAX_CONCURRENT_REQUESTS);

  const booleanFields = columns
    .filter((f) => f.secondaryType === 'boolean')
    .map((field) => {
      const query = appendToESQLQuery(
        esqlBaseQuery,
        `| STATS ${getSafeESQLName(`${field.name}_terms`)} = count(${getSafeESQLName(
          field.name
        )}) BY ${getSafeESQLName(field.name)}
        | LIMIT 3`
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

  if (booleanFields.length > 0) {
    const booleanTopTermsResp = await Promise.allSettled(
      booleanFields.map(({ request }) =>
        limiter(() => runRequest(request, { strategy: ESQL_SEARCH_STRATEGY }))
      )
    );
    if (booleanTopTermsResp) {
      return booleanFields.map(({ field, request }, idx) => {
        const resp = booleanTopTermsResp[idx];

        if (!resp) return;

        if (isFulfilled(resp) && resp.value) {
          const results = resp.value.rawResponse.values as Array<[BucketCount, boolean]>;
          const topValuesSampleSize = results.reduce((acc, row) => acc + row[0], 0);

          let falseCount = 0;
          let trueCount = 0;
          const terms = results.map((row) => {
            if (row[1] === false) {
              falseCount = row[0];
            }
            if (row[1] === true) {
              trueCount = row[0];
            }
            return {
              key_as_string: row[1] === false ? 'false' : 'true',
              doc_count: row[0],
              percent: row[0] / topValuesSampleSize,
            };
          });

          return {
            fieldName: field.name,
            topValues: terms,
            topValuesSampleSize,
            topValuesSamplerShardSize: topValuesSampleSize,
            isTopValuesSampled: false,
            trueCount,
            falseCount,
            count: trueCount + falseCount,
          } as BooleanFieldStats;
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
