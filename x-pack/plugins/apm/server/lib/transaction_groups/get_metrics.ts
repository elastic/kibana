/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from '../../../typings/es_schemas/ui/transaction';
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

function withAggs<T extends AggregationInputMap>(
  request: TransactionGroupRequestBase,
  aggs: T
) {
  return {
    ...request,
    body: {
      ...request.body,
      aggs: {
        ...request.body.aggs,
        transaction_groups: {
          ...request.body.aggs.transaction_groups,
          aggs,
        },
      },
    },
  };
}

export async function getSamples({ request, setup }: MetricParams) {
  const params = withAggs(request, {
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

  const response = await setup.client.search({
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

  return response.aggregations?.transaction_groups.buckets.map((bucket) => {
    return {
      key: bucket.key as string,
      count: bucket.doc_count,
      sample: bucket.sample.hits.hits[0]._source as Transaction,
    };
  });
}

export async function getAvg({ request, setup }: MetricParams) {
  const params = withAggs(request, {
    avg: {
      avg: {
        field: TRANSACTION_DURATION,
      },
    },
  });

  const response = await setup.client.search(params);

  return response.aggregations?.transaction_groups.buckets.map((bucket) => {
    return {
      key: bucket.key as string,
      avg: bucket.avg.value,
    };
  });
}

export async function getSum({ request, setup }: MetricParams) {
  const params = withAggs(request, {
    sum: {
      sum: {
        field: TRANSACTION_DURATION,
      },
    },
  });

  const response = await setup.client.search(params);

  return response.aggregations?.transaction_groups.buckets.map((bucket) => {
    return {
      key: bucket.key as string,
      sum: bucket.sum.value,
    };
  });
}

export async function getPercentiles({ request, setup }: MetricParams) {
  const params = withAggs(request, {
    p95: {
      percentiles: {
        field: TRANSACTION_DURATION,
        hdr: { number_of_significant_value_digits: 2 },
        percents: [95],
      },
    },
  });

  const response = await setup.client.search(params);

  return response.aggregations?.transaction_groups.buckets.map((bucket) => {
    return {
      key: bucket.key as string,
      p95: Object.values(bucket.p95.values)[0],
    };
  });
}
