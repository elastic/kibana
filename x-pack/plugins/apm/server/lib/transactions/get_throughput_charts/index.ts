/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESFilter } from '../../../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../../lib/helpers/aggregated_transactions';
import { getBucketSize } from '../../../lib/helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../../lib/helpers/setup_request';
import { getThroughputBuckets } from './transform';

export type ThroughputChartsResponse = PromiseReturnType<
  typeof searchThroughput
>;

async function searchThroughput({
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  intervalString,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  intervalString: string;
}) {
  const { start, end, apmEventClient } = setup;

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...setup.esFilter,
  ];

  if (transactionName) {
    filter.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  if (transactionType) {
    filter.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }

  const field = getTransactionDurationFieldForAggregatedTransactions(
    searchAggregatedTransactions
  );

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
              aggs: { count: { value_count: { field } } },
            },
          },
        },
      },
    },
  };

  return apmEventClient.search(params);
}

export async function getThroughputCharts({
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end } = setup;
  const { bucketSize, intervalString } = getBucketSize({ start, end });
  const durationAsMinutes = (end - start) / 1000 / 60;

  const response = await searchThroughput({
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
      durationAsMinutes,
    }),
  };
}
