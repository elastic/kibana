/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../../common/processor_event';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getTimeseriesAggregation,
  getTransactionErrorRateTimeSeries,
} from '../../helpers/transaction_error_rate';
import { CorrelationsOptions, getCorrelationsFilters } from '../get_filters';

export async function getOverallErrorTimeseries(options: CorrelationsOptions) {
  const { setup } = options;
  const filters = getCorrelationsFilters(options);
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end, numBuckets: 15 });

  const params = {
    // TODO: add support for metrics
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        timeseries: getTimeseriesAggregation(start, end, intervalString),
      },
    },
  };

  const response = await apmEventClient.search(
    'get_error_rate_timeseries',
    params
  );
  const { aggregations } = response;

  if (!aggregations) {
    return { overall: null };
  }

  return {
    overall: {
      timeseries: getTransactionErrorRateTimeSeries(
        aggregations.timeseries.buckets
      ),
    },
  };
}
