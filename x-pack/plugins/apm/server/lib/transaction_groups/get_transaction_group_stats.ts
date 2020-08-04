/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge } from 'lodash';
import { arrayUnionToCallable } from '../../../common/utils/array_union_to_callable';
import { AggregationInputMap } from '../../../typings/elasticsearch/aggregations';
import { TransactionGroupRequestBase, TransactionGroupSetup } from './fetcher';
import { getTransactionDurationFieldForAggregatedTransactions } from '../helpers/aggregated_transactions';

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

  const response = await setup.apmEventClient.search(params);

  return arrayUnionToCallable(
    response.aggregations?.transaction_groups.buckets ?? []
  ).map((bucket) => {
    return {
      key: bucket.key as BucketKey,
      avg: bucket.avg.value,
    };
  });
}

export async function getCounts({
  request,
  setup,
  searchAggregatedTransactions,
}: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    count: {
      value_count: {
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
      count: bucket.count.value,
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

  const response = await setup.apmEventClient.search(params);

  return arrayUnionToCallable(
    response.aggregations?.transaction_groups.buckets ?? []
  ).map((bucket) => {
    return {
      key: bucket.key as BucketKey,
      sum: bucket.sum.value,
    };
  });
}

export async function getPercentiles({
  request,
  setup,
  searchAggregatedTransactions,
}: MetricParams) {
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
}
