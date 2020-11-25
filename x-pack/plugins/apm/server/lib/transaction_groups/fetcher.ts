/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sortBy, take } from 'lodash';
import moment from 'moment';
import { Unionize } from 'utility-types';
import { AggregationOptionsByType } from '../../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../observability/typings/common';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { joinByKey } from '../../../common/utils/join_by_key';
import { getTransactionGroupsProjection } from '../../projections/transaction_groups';
import { mergeProjection } from '../../projections/util/merge_projection';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  getAverages,
  getCounts,
  getPercentiles,
  getSums,
} from './get_transaction_group_stats';

interface TopTransactionOptions {
  type: 'top_transactions';
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  searchAggregatedTransactions: boolean;
}

interface TopTraceOptions {
  type: 'top_traces';
  transactionName?: string;
  searchAggregatedTransactions: boolean;
}

export type Options = TopTransactionOptions | TopTraceOptions;

export type ESResponse = PromiseReturnType<typeof transactionGroupsFetcher>;

export type TransactionGroupRequestBase = ReturnType<
  typeof getTransactionGroupsProjection
> & {
  body: {
    aggs: {
      transaction_groups: Unionize<
        Pick<AggregationOptionsByType, 'composite' | 'terms'>
      >;
    };
  };
};

export type TransactionGroupSetup = Setup & SetupTimeRange;

function getItemsWithRelativeImpact(
  setup: TransactionGroupSetup,
  items: Array<{
    sum?: number | null;
    key: string | Record<'service.name' | 'transaction.name', string>;
    avg?: number | null;
    count?: number | null;
    transactionType?: string;
    p95?: number | null;
  }>
) {
  const values = items
    .map(({ sum }) => sum)
    .filter((value) => value !== null) as number[];

  const max = Math.max(...values);
  const min = Math.min(...values);

  const duration = moment.duration(setup.end - setup.start);
  const minutes = duration.asMinutes();

  const itemsWithRelativeImpact = items.map((item) => {
    return {
      key: item.key,
      averageResponseTime: item.avg,
      transactionsPerMinute: (item.count ?? 0) / minutes,
      transactionType: item.transactionType || '',
      impact:
        item.sum !== null && item.sum !== undefined
          ? ((item.sum - min) / (max - min)) * 100 || 0
          : 0,
      p95: item.p95,
    };
  });

  return itemsWithRelativeImpact;
}

export async function transactionGroupsFetcher(
  options: Options,
  setup: TransactionGroupSetup,
  bucketSize: number
) {
  const projection = getTransactionGroupsProjection({
    setup,
    options,
  });

  const isTopTraces = options.type === 'top_traces';

  // @ts-expect-error
  delete projection.body.aggs;

  // traces overview is hardcoded to 10000
  // transactions overview: 1 extra bucket is added to check whether the total number of buckets exceed the specified bucket size.
  const expectedBucketSize = isTopTraces ? 10000 : bucketSize;
  const size = isTopTraces ? 10000 : expectedBucketSize + 1;

  const request = mergeProjection(projection, {
    body: {
      size: 0,
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

  const params = {
    request,
    setup,
    searchAggregatedTransactions: options.searchAggregatedTransactions,
  };

  const [counts, averages, sums, percentiles] = await Promise.all([
    getCounts(params),
    getAverages(params),
    getSums(params),
    !isTopTraces ? getPercentiles(params) : Promise.resolve(undefined),
  ]);

  const stats = [
    ...averages,
    ...counts,
    ...sums,
    ...(percentiles ? percentiles : []),
  ];

  const items = joinByKey(stats, 'key');

  const itemsWithRelativeImpact = getItemsWithRelativeImpact(setup, items);

  const defaultServiceName =
    options.type === 'top_transactions' ? options.serviceName : undefined;

  const itemsWithKeys: TransactionGroup[] = itemsWithRelativeImpact.map(
    (item) => {
      let transactionName: string;
      let serviceName: string;

      if (typeof item.key === 'string') {
        transactionName = item.key;
        serviceName = defaultServiceName!;
      } else {
        transactionName = item.key[TRANSACTION_NAME];
        serviceName = item.key[SERVICE_NAME];
      }

      return {
        ...item,
        transactionName,
        serviceName,
      };
    }
  );

  return {
    items: take(
      // sort by impact by default so most impactful services are not cut off
      sortBy(itemsWithKeys, 'impact').reverse(),
      bucketSize
    ),
    // The aggregation is considered accurate if the configured bucket size is larger or equal to the number of buckets returned
    // the actual number of buckets retrieved are `bucketsize + 1` to detect whether it's above the limit
    isAggregationAccurate: expectedBucketSize >= itemsWithRelativeImpact.length,
    bucketSize,
  };
}

export interface TransactionGroup {
  key: string | Record<'service.name' | 'transaction.name', string>;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  averageResponseTime: number | null | undefined;
  transactionsPerMinute: number;
  p95: number | null | undefined;
  impact: number;
}
