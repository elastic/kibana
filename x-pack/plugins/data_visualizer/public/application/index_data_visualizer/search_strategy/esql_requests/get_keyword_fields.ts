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
import { isDefined } from '@kbn/ml-is-defined';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import { getSafeESQLName } from '../requests/esql_utils';
import { isFulfilled } from '../../../common/util/promise_all_settled_utils';
import { MAX_CONCURRENT_REQUESTS } from '../../constants/index_data_visualizer_viewer';
import type { BucketCount, BucketTerm } from '../../types/esql_data_visualizer';
import type { StringFieldStats } from '../../../../../common/types/field_stats';

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
    return {
      field,
      query: `| STATS ${getSafeESQLName(`${field.name}_terms`)} = count(${getSafeESQLName(
        field.name
      )}) BY ${getSafeESQLName(field.name)}
      | LIMIT 10
      | SORT ${getSafeESQLName(`${field.name}_terms`)} DESC`,
    };
  });

  if (keywordFields.length > 0) {
    const response = await Promise.allSettled(
      keywordFields.map(({ query }) =>
        limiter(() =>
          runRequest(
            {
              params: {
                query: esqlBaseQuery + query,
                ...(filter ? { filter } : {}),
              },
            },
            { strategy: ESQL_SEARCH_STRATEGY }
          )
        )
      )
    );
    const keywordTopTermsResp = response.filter(isFulfilled).flatMap((r) => r.value);
    if (keywordTopTermsResp) {
      return keywordFields.map(({ field }, idx) => {
        const resp = keywordTopTermsResp[idx];
        if (isDefined(resp)) {
          const results = resp.rawResponse.values as Array<[BucketCount, BucketTerm]>;
          const topValuesSampleSize = results.reduce((acc: number, row) => acc + row[0], 0);

          const terms = results.map((row) => ({
            key: row[1],
            doc_count: row[0],
            percent: row[0] / topValuesSampleSize,
          }));

          return {
            fieldName: field.name,
            topValues: terms,
            topValuesSampleSize,
            topValuesSamplerShardSize: topValuesSampleSize,
            isTopValuesSampled: false,
          } as StringFieldStats;
        }
      });
    }
  }
  return [];
};
