/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { sortBy } from 'lodash';
import moment from 'moment';
import { Unionize } from 'utility-types';
import { AggregationOptionsByType } from '../../../../../../src/core/types/elasticsearch';
import { kqlQuery, rangeQuery } from '../../../../observability/server';
import {
  PARENT_ID,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_ROOT,
} from '../../../common/elasticsearch_fieldnames';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { environmentQuery } from '../../../common/utils/environment_query';
import { joinByKey } from '../../../common/utils/join_by_key';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { Setup } from '../helpers/setup_request';
import { getAverages, getCounts, getSums } from './get_transaction_group_stats';

export interface TopTraceOptions {
  environment: string;
  kuery: string;
  transactionName?: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}

type Key = Record<'service.name' | 'transaction.name', string>;

export interface TransactionGroup {
  key: Key;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  averageResponseTime: number | null | undefined;
  transactionsPerMinute: number;
  impact: number;
}

export type ESResponse = Promise<{ items: TransactionGroup[] }>;

export type TransactionGroupRequestBase = ReturnType<typeof getRequest> & {
  body: {
    aggs: {
      transaction_groups: Unionize<Pick<AggregationOptionsByType, 'composite'>>;
    };
  };
};

function getRequest(topTraceOptions: TopTraceOptions) {
  const {
    searchAggregatedTransactions,
    environment,
    kuery,
    transactionName,
    start,
    end,
  } = topTraceOptions;

  const transactionNameFilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];

  return {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...transactionNameFilter,
            ...getDocumentTypeFilterForAggregatedTransactions(
              searchAggregatedTransactions
            ),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...(searchAggregatedTransactions
              ? [
                  {
                    term: {
                      [TRANSACTION_ROOT]: true,
                    },
                  },
                ]
              : []),
          ] as QueryDslQueryContainer[],
          must_not: [
            ...(!searchAggregatedTransactions
              ? [
                  {
                    exists: {
                      field: PARENT_ID,
                    },
                  },
                ]
              : []),
          ],
        },
      },
      aggs: {
        transaction_groups: {
          composite: {
            sources: asMutableArray([
              { [SERVICE_NAME]: { terms: { field: SERVICE_NAME } } },
              {
                [TRANSACTION_NAME]: {
                  terms: { field: TRANSACTION_NAME },
                },
              },
            ] as const),
            // traces overview is hardcoded to 10000
            size: 10000,
          },
        },
      },
    },
  };
}

export type TransactionGroupSetup = Setup;

function getItemsWithRelativeImpact(
  setup: TransactionGroupSetup,
  items: Array<{
    sum?: number | null;
    key: Key;
    avg?: number | null;
    count?: number | null;
    transactionType?: string;
  }>,
  start: number,
  end: number
) {
  const values = items
    .map(({ sum }) => sum)
    .filter((value) => value !== null) as number[];

  const max = Math.max(...values);
  const min = Math.min(...values);

  const duration = moment.duration(end - start);
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
    };
  });

  return itemsWithRelativeImpact;
}

export function topTransactionGroupsFetcher(
  topTraceOptions: TopTraceOptions,
  setup: TransactionGroupSetup
): Promise<{ items: TransactionGroup[] }> {
  return withApmSpan('get_top_traces', async () => {
    const request = getRequest(topTraceOptions);

    const params = {
      request,
      setup,
      searchAggregatedTransactions:
        topTraceOptions.searchAggregatedTransactions,
    };

    const [counts, averages, sums] = await Promise.all([
      getCounts(params),
      getAverages(params),
      getSums(params),
    ]);

    const stats = [...averages, ...counts, ...sums];

    const items = joinByKey(stats, 'key');

    const { start, end } = topTraceOptions;

    const itemsWithRelativeImpact = getItemsWithRelativeImpact(
      setup,
      items,
      start,
      end
    );

    const itemsWithKeys = itemsWithRelativeImpact.map((item) => ({
      ...item,
      transactionName: item.key[TRANSACTION_NAME],
      serviceName: item.key[SERVICE_NAME],
    }));

    return {
      // sort by impact by default so most impactful services are not cut off
      items: sortBy(itemsWithKeys, 'impact').reverse(),
    };
  });
}
