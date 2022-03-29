/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FAAS_COLDSTART,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { kqlQuery, rangeQuery } from '../../../../observability/server';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Coordinate } from '../../../typings/timeseries';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../helpers/transactions';
import { getBucketSizeForAggregatedTransactions } from '../helpers/get_bucket_size_for_aggregated_transactions';
import { Setup } from '../helpers/setup_request';
import {
  calculateTransactionColdstartRate,
  getColdstartAggregation,
  getTransactionColdstartRateTimeSeries,
} from '../helpers/transaction_coldstart_rate';
import { termQuery } from '../../../../observability/server';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';

export async function getColdstartRate({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  start,
  end,
  offset,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType?: string;
  transactionName: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  offset?: string;
}): Promise<{
  transactionColdstartRate: Coordinate[];
  average: number | null;
}> {
  const { apmEventClient } = setup;

  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const filter = [
    ...termQuery(SERVICE_NAME, serviceName),
    { exists: { field: FAAS_COLDSTART } },
    ...(transactionName ? termQuery(TRANSACTION_NAME, transactionName) : []),
    ...termQuery(TRANSACTION_TYPE, transactionType),
    ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
    ...rangeQuery(startWithOffset, endWithOffset),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  const coldstartStates = getColdstartAggregation();

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        coldstartStates,
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: getBucketSizeForAggregatedTransactions({
              start: startWithOffset,
              end: endWithOffset,
              searchAggregatedTransactions,
            }).intervalString,
            min_doc_count: 0,
            extended_bounds: { min: startWithOffset, max: endWithOffset },
          },
          aggs: {
            coldstartStates,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(
    'get_transaction_group_coldstart_rate',
    params
  );

  if (!resp.aggregations) {
    return { transactionColdstartRate: [], average: null };
  }

  const transactionColdstartRate = getTransactionColdstartRateTimeSeries(
    resp.aggregations.timeseries.buckets
  );

  const average = calculateTransactionColdstartRate(
    resp.aggregations.coldstartStates
  );

  return { transactionColdstartRate, average };
}

export async function getColdstartRatePeriods({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName = '',
  setup,
  searchAggregatedTransactions,
  start,
  end,
  offset,
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
  offset?: string;
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

  const currentPeriodPromise = getColdstartRate({ ...commonProps, start, end });

  const previousPeriodPromise = offset
    ? getColdstartRate({
        ...commonProps,
        start,
        end,
        offset,
      })
    : { transactionColdstartRate: [], average: null };

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  const firstCurrentPeriod = currentPeriod.transactionColdstartRate;

  return {
    currentPeriod,
    previousPeriod: {
      ...previousPeriod,
      transactionColdstartRate: offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries: firstCurrentPeriod,
        previousPeriodTimeseries: previousPeriod.transactionColdstartRate,
      }),
    },
  };
}
