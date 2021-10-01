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
import { kqlQuery, rangeQuery } from '../../../../observability/server';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Coordinate } from '../../../typings/timeseries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSizeForAggregatedTransactions } from '../helpers/get_bucket_size_for_aggregated_transactions';
import { Setup } from '../helpers/setup_request';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
  getFailedTransactionRateTimeSeries,
} from '../helpers/transaction_error_rate';

export async function getErrorRate({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
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
  start: number;
  end: number;
}): Promise<{
  noHits: boolean;
  transactionErrorRate: Coordinate[];
  average: number | null;
}> {
  const { apmEventClient } = setup;

  const transactionNamefilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];
  const transactionTypefilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    {
      terms: {
        [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success],
      },
    },
    ...transactionNamefilter,
    ...transactionTypefilter,
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  const outcomes = getOutcomeAggregation();

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
        outcomes,
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: getBucketSizeForAggregatedTransactions({
              start,
              end,
              searchAggregatedTransactions,
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

  const noHits = resp.hits.total.value === 0;

  if (!resp.aggregations) {
    return { noHits, transactionErrorRate: [], average: null };
  }

  const transactionErrorRate = getFailedTransactionRateTimeSeries(
    resp.aggregations.timeseries.buckets
  );

  const average = calculateFailedTransactionRate(resp.aggregations.outcomes);

  return { noHits, transactionErrorRate, average };
}

export async function getErrorRatePeriods({
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

  const currentPeriodPromise = getErrorRate({ ...commonProps, start, end });

  const previousPeriodPromise =
    comparisonStart && comparisonEnd
      ? getErrorRate({
          ...commonProps,
          start: comparisonStart,
          end: comparisonEnd,
        })
      : { noHits: true, transactionErrorRate: [], average: null };

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  const firstCurrentPeriod = currentPeriod.transactionErrorRate;

  return {
    currentPeriod,
    previousPeriod: {
      ...previousPeriod,
      transactionErrorRate: offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries: firstCurrentPeriod,
        previousPeriodTimeseries: previousPeriod.transactionErrorRate,
      }),
    },
  };
}
