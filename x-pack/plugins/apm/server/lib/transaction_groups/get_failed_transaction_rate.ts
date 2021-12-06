/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '../../../../observability/server';
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

export async function getFailedTransactionRate({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  start,
  end,
  numBuckets,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  numBuckets?: number;
}): Promise<{
  timeseries: Coordinate[];
  average: number | null;
}> {
  const { apmEventClient } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    {
      terms: {
        [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success],
      },
    },
    ...termQuery(TRANSACTION_NAME, transactionName),
    ...termQuery(TRANSACTION_TYPE, transactionType),
    ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
    ...rangeQuery(start, end),
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
              start,
              end,
              searchAggregatedTransactions,
              numBuckets,
            }).intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
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

export async function getFailedTransactionRatePeriods({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  comparisonStart,
  comparisonEnd,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  comparisonStart?: number;
  comparisonEnd?: number;
  start: number;
  end: number;
}) {
  const commonProps = {
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    setup,
    searchAggregatedTransactions,
  };

  const currentPeriodPromise = getFailedTransactionRate({
    ...commonProps,
    start,
    end,
  });

  const previousPeriodPromise =
    comparisonStart && comparisonEnd
      ? getFailedTransactionRate({
          ...commonProps,
          start: comparisonStart,
          end: comparisonEnd,
        })
      : { timeseries: [], average: null };

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  const currentPeriodTimeseries = currentPeriod.timeseries;

  return {
    currentPeriod,
    previousPeriod: {
      ...previousPeriod,
      timeseries: offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries,
        previousPeriodTimeseries: previousPeriod.timeseries,
      }),
    },
  };
}
