/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy, take } from 'lodash';
import moment from 'moment';
import { Unionize } from 'utility-types';
import {
  AggregationOptionsByType,
  ESFilter,
} from '../../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../observability/typings/common';
import {
  PARENT_ID,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_ROOT,
} from '../../../common/elasticsearch_fieldnames';
import { joinByKey } from '../../../common/utils/join_by_key';
import { environmentQuery, rangeQuery } from '../../../common/utils/queries';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  getAverages,
  getCounts,
  getPercentiles,
  getSums,
} from './get_transaction_group_stats';

interface TopTransactionOptions {
  environment?: string;
  type: 'top_transactions';
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  searchAggregatedTransactions: boolean;
}

interface TopTraceOptions {
  environment?: string;
  type: 'top_traces';
  transactionName?: string;
  searchAggregatedTransactions: boolean;
}

export type Options = TopTransactionOptions | TopTraceOptions;

export type ESResponse = PromiseReturnType<typeof transactionGroupsFetcher>;

export interface TransactionGroupRequestBase {
  body: {
    aggs: {
      transaction_groups: Unionize<
        Pick<AggregationOptionsByType, 'composite' | 'terms'>
      >;
    };
  };
}

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

export function transactionGroupsFetcher(
  options: Options,
  setup: TransactionGroupSetup,
  bucketSize: number
) {
  const { start, end, esFilter } = setup;
  const {
    environment,
    transactionName,
    searchAggregatedTransactions,
  } = options;

  const spanName =
    options.type === 'top_traces' ? 'get_top_traces' : 'get_top_transactions';

  return withApmSpan(spanName, async () => {
    const isTopTraces = options.type === 'top_traces';

    const transactionNameFilter = transactionName
      ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
      : [];

    const bool: { filter: ESFilter[]; must_not: ESFilter[] } = {
      filter: [
        ...transactionNameFilter,
        ...getDocumentTypeFilterForAggregatedTransactions(
          searchAggregatedTransactions
        ),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...esFilter,
      ],
      must_not: [],
    };

    if (options.type === 'top_traces') {
      if (options.searchAggregatedTransactions) {
        bool.filter.push({
          term: {
            [TRANSACTION_ROOT]: true,
          },
        });
      } else {
        bool.must_not = [
          {
            exists: {
              field: PARENT_ID,
            },
          },
        ];
      }
    }

    // traces overview is hardcoded to 10000
    // transactions overview: 1 extra bucket is added to check whether the total number of buckets exceed the specified bucket size.
    const expectedBucketSize = isTopTraces ? 10000 : bucketSize;
    const size = isTopTraces ? 10000 : expectedBucketSize + 1;

    const request = {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
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
        query: { bool },
      },
    };

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
        let itemTransactionName: string;
        let serviceName: string;

        if (typeof item.key === 'string') {
          itemTransactionName = item.key;
          serviceName = defaultServiceName!;
        } else {
          itemTransactionName = item.key[TRANSACTION_NAME];
          serviceName = item.key[SERVICE_NAME];
        }

        return {
          ...item,
          transactionName: itemTransactionName,
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
      isAggregationAccurate:
        expectedBucketSize >= itemsWithRelativeImpact.length,
      bucketSize,
    };
  });
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
