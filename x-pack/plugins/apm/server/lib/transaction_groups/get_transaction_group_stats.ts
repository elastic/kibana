/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { TRANSACTION_TYPE } from '../../../common/elasticsearch_fieldnames';
import { arrayUnionToCallable } from '../../../common/utils/array_union_to_callable';
import { AggregationInputMap } from '../../../../../typings/elasticsearch';
import { TransactionGroupRequestBase, TransactionGroupSetup } from './fetcher';
import { getTransactionDurationFieldForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { withApmSpan } from '../../utils/with_apm_span';

interface MetricParams {
  request: TransactionGroupRequestBase;
  setup: TransactionGroupSetup;
  searchAggregatedTransactions: boolean;
}

type BucketKey = string | Record<string, string>;

function mergeRequestWithAggs<
  TRequestBase extends TransactionGroupRequestBase,
  TInputMap extends AggregationInputMap
>(request: TRequestBase, aggs: TInputMap) {
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

export function getAverages({
  request,
  setup,
  searchAggregatedTransactions,
}: MetricParams) {
  return withApmSpan('get_avg_transaction_group_duration', async () => {
    const params = mergeRequestWithAggs(request, {
      avg: {
        avg: {
          field: getTransactionDurationFieldForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        },
      },
    });

    const response = await setup.apmEventClient.search(params);

    return arrayUnionToCallable(
      response.aggregations?.transaction_groups.buckets ?? []
    ).map((bucket) => {
      return {
        key: bucket.key as BucketKey,
        avg: bucket.avg.value,
      };
    });
  });
}

export function getCounts({ request, setup }: MetricParams) {
  return withApmSpan('get_transaction_group_transaction_count', async () => {
    const params = mergeRequestWithAggs(request, {
      transaction_type: {
        top_metrics: {
          sort: {
            '@timestamp': 'desc',
          },
          metrics: {
            field: TRANSACTION_TYPE,
          } as const,
        },
      },
    });

    const response = await setup.apmEventClient.search(params);

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
  });
}

export function getSums({
  request,
  setup,
  searchAggregatedTransactions,
}: MetricParams) {
  return withApmSpan('get_transaction_group_latency_sums', async () => {
    const params = mergeRequestWithAggs(request, {
      sum: {
        sum: {
          field: getTransactionDurationFieldForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        },
      },
    });

    const response = await setup.apmEventClient.search(params);

    return arrayUnionToCallable(
      response.aggregations?.transaction_groups.buckets ?? []
    ).map((bucket) => {
      return {
        key: bucket.key as BucketKey,
        sum: bucket.sum.value,
      };
    });
  });
}

export function getPercentiles({
  request,
  setup,
  searchAggregatedTransactions,
}: MetricParams) {
  return withApmSpan('get_transaction_group_latency_percentiles', async () => {
    const params = mergeRequestWithAggs(request, {
      p95: {
        percentiles: {
          field: getTransactionDurationFieldForAggregatedTransactions(
            searchAggregatedTransactions
          ),
          hdr: { number_of_significant_value_digits: 2 },
          percents: [95],
        },
      },
    });

    const response = await setup.apmEventClient.search(params);

    return arrayUnionToCallable(
      response.aggregations?.transaction_groups.buckets ?? []
    ).map((bucket) => {
      return {
        key: bucket.key as BucketKey,
        p95: Object.values(bucket.p95.values)[0],
      };
    });
  });
}
