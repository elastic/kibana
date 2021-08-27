/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { estypes } from '@elastic/elasticsearch';
import { TRANSACTION_TYPE } from '../../../common/elasticsearch_fieldnames';
import { arrayUnionToCallable } from '../../../common/utils/array_union_to_callable';
import { TransactionGroupRequestBase, TransactionGroupSetup } from './fetcher';
import { getTransactionDurationFieldForAggregatedTransactions } from '../helpers/aggregated_transactions';

interface MetricParams {
  request: TransactionGroupRequestBase;
  setup: TransactionGroupSetup;
  searchAggregatedTransactions: boolean;
}

type BucketKey = Record<string, string>;

function mergeRequestWithAggs<
  TRequestBase extends TransactionGroupRequestBase,
  TAggregationMap extends Record<
    string,
    estypes.AggregationsAggregationContainer
  >
>(request: TRequestBase, aggs: TAggregationMap) {
  return merge({}, request, {
    body: {
      aggs: {
        transaction_groups: {
          aggs,
        },
      },
    },
  });
}

export async function getAverages({
  request,
  setup,
  searchAggregatedTransactions,
}: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    avg: {
      avg: {
        field: getTransactionDurationFieldForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      },
    },
  });

  const response = await setup.apmEventClient.search(
    'get_avg_transaction_group_duration',
    params
  );

  return arrayUnionToCallable(
    response.aggregations?.transaction_groups.buckets ?? []
  ).map((bucket) => {
    return {
      key: bucket.key as BucketKey,
      avg: bucket.avg.value,
    };
  });
}

export async function getCounts({ request, setup }: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    transaction_type: {
      top_metrics: {
        sort: {
          '@timestamp': 'desc' as const,
        },
        metrics: [
          {
            field: TRANSACTION_TYPE,
          } as const,
        ],
      },
    },
  });

  const response = await setup.apmEventClient.search(
    'get_transaction_group_transaction_count',
    params
  );

  return arrayUnionToCallable(
    response.aggregations?.transaction_groups.buckets ?? []
  ).map((bucket) => {
    return {
      key: bucket.key as BucketKey,
      count: bucket.doc_count,
      transactionType: bucket.transaction_type.top[0].metrics[
        TRANSACTION_TYPE
      ] as string,
    };
  });
}

export async function getSums({
  request,
  setup,
  searchAggregatedTransactions,
}: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    sum: {
      sum: {
        field: getTransactionDurationFieldForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      },
    },
  });

  const response = await setup.apmEventClient.search(
    'get_transaction_group_latency_sums',
    params
  );

  return arrayUnionToCallable(
    response.aggregations?.transaction_groups.buckets ?? []
  ).map((bucket) => {
    return {
      key: bucket.key as BucketKey,
      sum: bucket.sum.value,
    };
  });
}
