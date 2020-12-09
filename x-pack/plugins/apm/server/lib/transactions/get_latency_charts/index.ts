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
import { convertLatencyBucketsToCoordinates } from './transform';

export type LatencyChartsSearchResponse = PromiseReturnType<
  typeof searchLatency
>;

async function searchLatency({
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
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });

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
        latencyTimeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            avg: { avg: { field } },
            pct: {
              percentiles: {
                field,
                percents: [95, 99],
                hdr: { number_of_significant_value_digits: 2 },
              },
            },
          },
        },
        overall_avg_duration: { avg: { field } },
      },
    },
  };

  return apmEventClient.search(params);
}

export async function getLatencyTimeseries({
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
  const response = await searchLatency({
    serviceName,
    transactionType,
    transactionName,
    setup,
    searchAggregatedTransactions,
  });

  if (!response.aggregations) {
    return {
      latencyTimeseries: { avg: [], p95: [], p99: [] },
      overallAvgDuration: null,
    };
  }

  return {
    overallAvgDuration:
      response.aggregations.overall_avg_duration.value || null,
    latencyTimeseries: convertLatencyBucketsToCoordinates(
      response.aggregations.latencyTimeseries.buckets
    ),
  };
}
