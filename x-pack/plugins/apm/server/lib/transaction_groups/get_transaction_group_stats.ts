/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { estypes } from '@elastic/elasticsearch';
import {
  PARENT_ID,
  TRANSACTION_TYPE,
  TRANSACTION_ROOT,
  TRANSACTION_NAME,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { arrayUnionToCallable } from '../../../common/utils/array_union_to_callable';
import { Key, TopTraceOptions, TransactionGroupSetup } from './fetcher';
import { getTransactionDurationFieldForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { kqlQuery, rangeQuery } from '../../../../observability/server';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';

interface MetricParams {
  topTraceOptions: TopTraceOptions;
  setup: TransactionGroupSetup;
}

function getParams<
  TAggregationMap extends Record<
    string,
    estypes.AggregationsAggregationContainer
  >
>({
  topTraceOptions,
  setup,
  aggs,
}: {
  topTraceOptions: TopTraceOptions;
  setup: TransactionGroupSetup;
  aggs: TAggregationMap;
}) {
  const { start, end } = setup;

  const {
    searchAggregatedTransactions,
    environment,
    kuery,
    transactionName,
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
          aggs,
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

export async function getAverages({ topTraceOptions, setup }: MetricParams) {
  const params = getParams({
    topTraceOptions,
    setup,
    aggs: {
      avg: {
        avg: {
          field: getTransactionDurationFieldForAggregatedTransactions(
            topTraceOptions.searchAggregatedTransactions
          ),
        },
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
      key: bucket.key as Key,
      avg: bucket.avg.value,
    };
  });
}

export async function getCounts({ topTraceOptions, setup }: MetricParams) {
  const params = getParams({
    topTraceOptions,
    setup,
    aggs: {
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
      key: bucket.key as Key,
      count: bucket.doc_count,
      transactionType: bucket.transaction_type.top[0].metrics[
        TRANSACTION_TYPE
      ] as string,
    };
  });
}

export async function getSums({ topTraceOptions, setup }: MetricParams) {
  const params = getParams({
    topTraceOptions,
    setup,
    aggs: {
      sum: {
        sum: {
          field: getTransactionDurationFieldForAggregatedTransactions(
            topTraceOptions.searchAggregatedTransactions
          ),
        },
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
      key: bucket.key as Key,
      sum: bucket.sum.value,
    };
  });
}
