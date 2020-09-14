/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge } from 'lodash';
import { arrayUnionToCallable } from '../../../common/utils/array_union_to_callable';
import {
  TRANSACTION_SAMPLED,
  TRANSACTION_DURATION,
} from '../../../common/elasticsearch_fieldnames';
import {
  AggregationInputMap,
  SortOptions,
} from '../../../typings/elasticsearch/aggregations';
import { TransactionGroupRequestBase, TransactionGroupSetup } from './fetcher';

interface MetricParams {
  request: TransactionGroupRequestBase;
  setup: TransactionGroupSetup;
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

export async function getSamples({ request, setup }: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    sample: {
      top_hits: {
        size: 1,
      },
    },
  });

  const sort: SortOptions = [
    { _score: 'desc' as const }, // sort by _score to ensure that buckets with sampled:true ends up on top
    { '@timestamp': { order: 'desc' as const } },
  ];

  const response = await setup.apmEventClient.search({
    ...params,
    body: {
      ...params.body,
      query: {
        ...params.body.query,
        bool: {
          ...params.body.query.bool,
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }],
        },
      },
      sort,
    },
  });

  return arrayUnionToCallable(
    response.aggregations?.transaction_groups.buckets ?? []
  ).map((bucket) => {
    return {
      key: bucket.key as BucketKey,
      count: bucket.doc_count,
      sample: bucket.sample.hits.hits[0]._source,
    };
  });
}

export async function getAverages({ request, setup }: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    avg: {
      avg: {
        field: TRANSACTION_DURATION,
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

export async function getSums({ request, setup }: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    sum: {
      sum: {
        field: TRANSACTION_DURATION,
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

export async function getPercentiles({ request, setup }: MetricParams) {
  const params = mergeRequestWithAggs(request, {
    p95: {
      percentiles: {
        field: TRANSACTION_DURATION,
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
