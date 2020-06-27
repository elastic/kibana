/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_SAMPLED,
  TRANSACTION_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { getTransactionGroupsProjection } from '../../../common/projections/transaction_groups';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import { PromiseReturnType } from '../../../../observability/typings/common';
import { SortOptions } from '../../../typings/elasticsearch/aggregations';
import { Transaction } from '../../../typings/es_schemas/ui/transaction';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';

interface TopTransactionOptions {
  type: 'top_transactions';
  serviceName: string;
  transactionType: string;
  transactionName?: string;
}

interface TopTraceOptions {
  type: 'top_traces';
  transactionName?: string;
}

export type Options = TopTransactionOptions | TopTraceOptions;

export type ESResponse = PromiseReturnType<typeof transactionGroupsFetcher>;
export async function transactionGroupsFetcher(
  options: Options,
  setup: Setup & SetupTimeRange & SetupUIFilters,
  bucketSize: number
) {
  const { client } = setup;

  const projection = getTransactionGroupsProjection({
    setup,
    options,
  });

  const sort: SortOptions = [
    { _score: 'desc' as const }, // sort by _score to ensure that buckets with sampled:true ends up on top
    { '@timestamp': { order: 'desc' as const } },
  ];

  const isTopTraces = options.type === 'top_traces';

  if (isTopTraces) {
    // Delete the projection aggregation when searching for traces, as it should use the combined aggregation instead
    delete projection.body.aggs;
  }

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          // prefer sampled transactions
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }],
        },
      },
      aggs: {
        transaction_groups: {
          composite: {
            size: bucketSize + 1, // 1 extra bucket is added to check whether the total number of buckets exceed the specified bucket size.
            sources: [
              ...(isTopTraces
                ? [{ service: { terms: { field: SERVICE_NAME } } }]
                : []),
              { transaction: { terms: { field: TRANSACTION_NAME } } },
            ],
          },
          aggs: {
            sample: { top_hits: { size: 1, sort } },
            avg: { avg: { field: TRANSACTION_DURATION } },
            p95: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [95],
                hdr: { number_of_significant_value_digits: 2 },
              },
            },
            sum: { sum: { field: TRANSACTION_DURATION } },
          },
        },
      },
    },
  });

  return client.search<Transaction, typeof params>(params);
}
