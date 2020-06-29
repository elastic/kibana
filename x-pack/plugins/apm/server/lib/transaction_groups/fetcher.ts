/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten, findIndex, isEqual } from 'lodash';
import { ValuesType } from 'utility-types';
import moment from 'moment';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_SAMPLED,
  TRANSACTION_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { getTransactionGroupsProjection } from '../../../common/projections/transaction_groups';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import { PromiseReturnType } from '../../../../observability/typings/common';
import {
  SortOptions,
  AggregationInputMap,
} from '../../../typings/elasticsearch/aggregations';
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

  const isTopTraces = options.type === 'top_traces';

  delete projection.body.aggs;

  const size = bucketSize + 1;

  const request = mergeProjection(projection, {
    size: 0,
    body: {
      aggs: {
        transaction_groups: {
          ...(isTopTraces
            ? {
                composite: {
                  sources: [
                    { [SERVICE_NAME]: { terms: { field: SERVICE_NAME } } },
                    {
                      [TRANSACTION_NAME]: {
                        terms: { field: TRANSACTION_NAME },
                      },
                    },
                  ],
                  size,
                },
              }
            : {
                terms: {
                  field: TRANSACTION_NAME,
                  size,
                },
              }),
        },
      },
    },
  });

  function withAggs<T extends AggregationInputMap>(aggs: T) {
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

  async function getSamples() {
    const params = withAggs({
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

    const response = await client.search({
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
        key: bucket.key,
        count: bucket.doc_count,
        sample: bucket.sample.hits.hits[0]._source as Transaction,
      };
    });
  }

  async function getAvg() {
    const params = withAggs({
      avg: {
        avg: {
          field: TRANSACTION_DURATION,
        },
      },
    });

    const response = await client.search(params);

    return response.aggregations?.transaction_groups.buckets.map((bucket) => {
      return {
        key: bucket.key,
        avg: bucket.avg.value,
      };
    });
  }

  async function getSum() {
    const params = withAggs({
      sum: {
        sum: {
          field: TRANSACTION_DURATION,
        },
      },
    });

    const response = await client.search(params);

    return response.aggregations?.transaction_groups.buckets.map((bucket) => {
      return {
        key: bucket.key,
        sum: bucket.sum.value,
      };
    });
  }

  async function getPercentiles() {
    const params = withAggs({
      p95: {
        percentiles: {
          field: TRANSACTION_DURATION,
          hdr: { number_of_significant_value_digits: 2 },
          percents: [95],
        },
      },
    });

    const response = await client.search(params);

    return response.aggregations?.transaction_groups.buckets.map((bucket) => {
      return {
        key: bucket.key,
        p95: Object.values(bucket.p95.values)[0],
      };
    });
  }

  const metrics = await Promise.all([
    getSamples(),
    getAvg(),
    getSum(),
    !isTopTraces ? getPercentiles() : Promise.resolve(undefined),
  ]);

  const items: TransactionGroupData[] = [];

  type Metric = ValuesType<Exclude<ValuesType<typeof metrics>, undefined>>;

  const allMetrics = flatten(metrics as any).filter(Boolean) as Metric[];

  allMetrics.forEach((metric) => {
    // we use indexOf so we can replace the existing item with a new one
    // this will give us type safety (Object.assign is unsafe)
    let indexOf = findIndex(items, (i) => isEqual(i.key, metric.key));
    let item = items[indexOf];

    if (indexOf === -1) {
      const newItem = {
        key: metric.key,
      };
      items.push(newItem);
      item = newItem;
      indexOf = items.length - 1;
    }

    const newItem = {
      ...item,
      ...metric,
    };

    items[indexOf] = newItem;
  });

  const values = items
    .map(({ sum }) => sum)
    .filter((value) => value !== null) as number[];

  const max = Math.max(...values);
  const min = Math.min(...values);

  const duration = moment.duration(setup.end - setup.start);
  const minutes = duration.asMinutes();

  const itemsWithRelativeImpact: TransactionGroup[] = items
    .map((item) => {
      return {
        key: item.key,
        averageResponseTime: item.avg,
        transactionsPerMinute: (item.count ?? 0) / minutes,
        impact:
          item.sum !== null && item.sum !== undefined
            ? ((item.sum - min) / (max - min)) * 100 || 0
            : 0,
        p95: item.p95,
        sample: item.sample!,
      };
    })
    .filter((item) => item.sample);

  return {
    items: itemsWithRelativeImpact,
    // The aggregation is considered accurate if the configured bucket size is larger or equal to the number of buckets returned
    // the actual number of buckets retrieved are `bucketsize + 1` to detect whether it's above the limit
    isAggregationAccurate: bucketSize >= items.length,
    bucketSize,
  };
}

interface TransactionGroupData {
  key: Record<string, any> | string;
  count?: number;
  avg?: number | null;
  sum?: number | null;
  p95?: number;
  sample?: Transaction;
}

export interface TransactionGroup {
  key: Record<string, any> | string;
  averageResponseTime: number | null | undefined;
  transactionsPerMinute: number;
  p95: number | undefined;
  impact: number;
  sample: Transaction;
}
