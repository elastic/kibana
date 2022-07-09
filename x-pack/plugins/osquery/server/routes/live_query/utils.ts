/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys, snakeCase } from 'lodash';
import { of } from 'rxjs';
import { mergeMap, retry, catchError } from 'rxjs/operators';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import type {
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
} from '../../../common/search_strategy';
import { OsqueryQueries } from '../../../common/search_strategy';

export const getActionResponses = (search, actionId, queriedAgentIds) =>
  search
    .search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
      {
        actionId,
        factoryQueryType: OsqueryQueries.actionResults,
        filterQuery: '',
        pagination: generateTablePaginationOptions(0, 1000),
        sort: {
          direction: 'desc',
          field: '@timestamp',
        },
      },
      {
        strategy: 'osquerySearchStrategy',
      }
    )
    .pipe(
      mergeMap((val) => {
        const responded =
          // @ts-expect-error update types
          val.rawResponse?.aggregations?.aggs.responses_by_action_id?.doc_count ?? 0;
        const docs =
          // @ts-expect-error update types
          val.rawResponse?.aggregations?.aggs.responses_by_action_id?.rows_count?.value ?? 0;
        const aggsBuckets =
          // @ts-expect-error update types
          val.rawResponse?.aggregations?.aggs.responses_by_action_id?.responses.buckets;
        const successful = aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
        // @ts-expect-error update types
        const failed = aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;
        const pending = queriedAgentIds.length - responded;

        const returnData = of(
          mapKeys(
            {
              actionId,
              docs,
              failed,
              pending,
              responded,
              successful,
            },
            (_, key) => snakeCase(key)
          )
        );

        return returnData;
      }),
      retry({ count: 5, delay: 4000 })
    )
    .pipe(catchError((e) => e));
