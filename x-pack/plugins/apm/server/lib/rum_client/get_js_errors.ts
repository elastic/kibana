/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeProjection } from '../../projections/util/merge_projection';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getRumErrorsProjection } from '../../projections/rum_page_load_transactions';
import {
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';

export async function getJSErrors({
  setup,
  pageSize,
  pageIndex,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange;
  pageSize: number;
  pageIndex: number;
  urlQuery?: string;
}) {
  const projection = getRumErrorsProjection({
    setup,
    urlQuery,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      track_total_hits: true,
      aggs: {
        totalErrorGroups: {
          cardinality: {
            field: ERROR_GROUP_ID,
          },
        },
        totalErrorPages: {
          cardinality: {
            field: TRANSACTION_ID,
          },
        },
        errors: {
          terms: {
            field: ERROR_GROUP_ID,
            size: 500,
          },
          aggs: {
            bucket_truncate: {
              bucket_sort: {
                size: pageSize,
                from: pageIndex * pageSize,
              },
            },
            sample: {
              top_hits: {
                _source: [
                  ERROR_EXC_MESSAGE,
                  ERROR_EXC_TYPE,
                  ERROR_GROUP_ID,
                  '@timestamp',
                ],
                sort: [{ '@timestamp': 'desc' as const }],
                size: 1,
              },
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const response = await apmEventClient.search(params);

  const { totalErrorGroups, totalErrorPages, errors } =
    response.aggregations ?? {};

  return {
    totalErrorPages: totalErrorPages?.value ?? 0,
    totalErrors: response.hits.total.value ?? 0,
    totalErrorGroups: totalErrorGroups?.value ?? 0,
    items: errors?.buckets.map(({ sample, doc_count: count, key }) => {
      return {
        count,
        errorGroupId: key,
        errorMessage: (sample.hits.hits[0]._source as {
          error: { exception: Array<{ message: string }> };
        }).error.exception?.[0].message,
      };
    }),
  };
}
