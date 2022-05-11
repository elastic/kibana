/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Coordinate } from '../../../typings/timeseries';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../helpers/transactions';
import { getBucketSizeForAggregatedTransactions } from '../helpers/get_bucket_size_for_aggregated_transactions';
import { Setup } from '../helpers/setup_request';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
  getFailedTransactionRateTimeSeries,
} from '../helpers/transaction_error_rate';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';

export async function getFailedTransactionRate({
  environment,
  kuery,
  serviceName,
  transactionTypes,
  transactionName,
  setup,
  searchAggregatedTransactions,
  start,
  end,
  numBuckets,
  offset,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionTypes: string[];
  transactionName?: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  numBuckets?: number;
  offset?: string;
}): Promise<{
  timeseries: Coordinate[];
  average: number | null;
}> {
  const { apmEventClient } = setup;

  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    {
      terms: {
        [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success],
      },
    },
    { terms: { [TRANSACTION_TYPE]: transactionTypes } },
    ...termQuery(TRANSACTION_NAME, transactionName),
    ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
    ...rangeQuery(startWithOffset, endWithOffset),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  const outcomes = getOutcomeAggregation();

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        outcomes,
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: getBucketSizeForAggregatedTransactions({
              start: startWithOffset,
              end: endWithOffset,
              searchAggregatedTransactions,
              numBuckets,
            }).intervalString,
            min_doc_count: 0,
            extended_bounds: { min: startWithOffset, max: endWithOffset },
          },
          aggs: {
            outcomes,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(
    'get_transaction_group_error_rate',
    params
  );
  if (!resp.aggregations) {
    return { timeseries: [], average: null };
  }

  const timeseries = getFailedTransactionRateTimeSeries(
    resp.aggregations.timeseries.buckets
  );
  const average = calculateFailedTransactionRate(resp.aggregations.outcomes);

  return { timeseries, average };
}
