/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getFailedTransactionRate } from '../../lib/transaction_groups/get_failed_transaction_rate';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getFailedTransactionRatePeriods({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
  offset,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  offset?: string;
}) {
  const commonProps = {
    environment,
    kuery,
    serviceName,
    transactionTypes: [transactionType],
    transactionName,
    apmEventClient,
    searchAggregatedTransactions,
  };

  const currentPeriodPromise = getFailedTransactionRate({
    ...commonProps,
    start,
    end,
  });

  const previousPeriodPromise = offset
    ? getFailedTransactionRate({
        ...commonProps,
        start,
        end,
        offset,
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
