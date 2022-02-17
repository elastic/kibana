/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeProjection } from '../../projections/util/merge_projection';
import { SetupUX } from './route';
import { getRumErrorsProjection } from '../../projections/rum_page_load_transactions';
import {
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  TRANSACTION_ID,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';

export async function getJSErrors({
  setup,
  pageSize,
  pageIndex,
  urlQuery,
  start,
  end,
}: {
  setup: SetupUX;
  pageSize: number;
  pageIndex: number;
  urlQuery?: string;
  start: number;
  end: number;
}) {
  const projection = getRumErrorsProjection({
    setup,
    urlQuery,
    start,
    end,
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
            impactedPages: {
              filter: {
                term: {
                  [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD,
                },
              },
              aggs: {
                pageCount: {
                  cardinality: {
                    field: TRANSACTION_ID,
                  },
                },
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

  const response = await apmEventClient.search('get_js_errors', params);

  const { totalErrorGroups, totalErrorPages, errors } =
    response.aggregations ?? {};

  return {
    totalErrorPages: totalErrorPages?.value ?? 0,
    totalErrors: response.hits.total.value ?? 0,
    totalErrorGroups: totalErrorGroups?.value ?? 0,
    items: errors?.buckets.map(({ sample, key, impactedPages }) => {
      return {
        count: impactedPages.pageCount.value,
        errorGroupId: key,
        errorMessage: (
          sample.hits.hits[0]._source as {
            error: { exception: Array<{ message: string }> };
          }
        ).error.exception?.[0].message,
      };
    }),
  };
}
