/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../../../src/core/types/elasticsearch';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { kqlQuery, rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../../../lib/helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../../../lib/helpers/setup_request';
import { getBucketSizeForAggregatedTransactions } from '../../helpers/get_bucket_size_for_aggregated_transactions';
import { getThroughputBuckets } from './transform';

export type ThroughputChartsResponse = PromiseReturnType<
  typeof searchThroughput
>;

function searchThroughput({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  intervalString,
}: {
  environment?: string;
  kuery?: string;
  serviceName: string;
  transactionType: string;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  intervalString: string;
}) {
  const { start, end, apmEventClient } = setup;

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  if (transactionName) {
    filter.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        throughput: {
          terms: { field: TRANSACTION_RESULT, missing: '' },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: start, max: end },
              },
            },
          },
        },
      },
    },
  };

  return apmEventClient.search('get_transaction_throughput_series', params);
}

export async function getThroughputCharts({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
}: {
  environment?: string;
  kuery?: string;
  serviceName: string;
  transactionType: string;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { bucketSize, intervalString } = getBucketSizeForAggregatedTransactions(
    {
      ...setup,
      searchAggregatedTransactions,
    }
  );

  const response = await searchThroughput({
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    setup,
    searchAggregatedTransactions,
    intervalString,
  });

  return {
    throughputTimeseries: getThroughputBuckets({
      throughputResultBuckets: response.aggregations?.throughput.buckets,
      bucketSize,
      setupTimeRange: setup,
    }),
  };
}
