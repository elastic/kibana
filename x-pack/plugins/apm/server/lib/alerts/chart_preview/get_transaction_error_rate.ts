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
import { environmentQuery, rangeQuery } from '../../../../common/utils/queries';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import {
  calculateTransactionErrorPercentage,
  getOutcomeAggregation,
} from '../../helpers/transaction_error_rate';

export async function getTransactionErrorRateChartPreview({
  setup,
  alertParams,
}: {
  setup: Setup & SetupTimeRange;
  alertParams: AlertParams;
}) {
  const { apmEventClient, start, end } = setup;
  const { serviceName, environment, transactionType } = alertParams;

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

  const { intervalString } = getBucketSize({ start, end, numBuckets: 20 });

  const aggs = {
    outcomes,
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: intervalString,
      },
      aggs: { outcomes },
    },
  };

  const params = {
    apm: { events: [ProcessorEvent.transaction] },
    body: { size: 0, query, aggs },
  };

  const resp = await apmEventClient.search(params);

  if (!resp.aggregations) {
    return [];
  }

  return resp.aggregations.timeseries.buckets.map((bucket) => {
    const errorPercentage = calculateTransactionErrorPercentage(
      bucket.outcomes
    );
    return {
      x: bucket.key,
      y: errorPercentage,
    };
  });
}
