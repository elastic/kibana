/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { AlertParams } from '../../../routes/alerts/chart_preview';
import { rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { Setup } from '../../helpers/setup_request';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../helpers/transaction_error_rate';
import { getIntervalAndTimeRange } from './helper';

export async function getTransactionErrorRateChartPreview({
  setup,
  alertParams,
}: {
  setup: Setup;
  alertParams: AlertParams;
}) {
  const { apmEventClient } = setup;
  const {
    serviceName,
    environment,
    transactionType,
    windowSize,
    windowUnit,
  } = alertParams;

  const { interval, start, end } = getIntervalAndTimeRange({
    windowSize,
    windowUnit,
  });

  const query = {
    bool: {
      filter: [
        { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
        ...(transactionType
          ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
          : []),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
      ],
    },
  };

  const outcomes = getOutcomeAggregation();

  const aggs = {
    outcomes,
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: interval,
        extended_bounds: {
          min: start,
          max: end,
        },
      },
      aggs: { outcomes },
    },
  };

  const params = {
    apm: { events: [ProcessorEvent.transaction] },
    body: { size: 0, query, aggs },
  };

  const resp = await apmEventClient.search(
    'get_transaction_error_rate_chart_preview',
    params
  );

  if (!resp.aggregations) {
    return [];
  }

  return resp.aggregations.timeseries.buckets.map((bucket) => {
    return {
      x: bucket.key,
      y: calculateFailedTransactionRate(bucket.outcomes),
    };
  });
}
