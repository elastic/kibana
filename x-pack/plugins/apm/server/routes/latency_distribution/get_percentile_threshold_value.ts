/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';

import { getTransactionDurationPercentilesRequest } from '../correlations/queries/query_percentiles';

import type { OverallLatencyDistributionOptions } from './types';

export async function getPercentileThresholdValue(
  options: OverallLatencyDistributionOptions
) {
  const { setup, percentileThreshold, ...rawParams } = options;
  const { apmEventClient } = setup;
  const params = {
    // pass on an empty index because we're using only the body attribute
    // of the request body getters we're reusing from search strategies.
    index: '',
    ...rawParams,
  };

  const { body: transactionDurationPercentilesRequestBody } =
    getTransactionDurationPercentilesRequest(params, [percentileThreshold]);

  const transactionDurationPercentilesResponse = (await apmEventClient.search(
    'get_transaction_duration_percentiles',
    {
      // TODO: add support for metrics
      apm: { events: [ProcessorEvent.transaction] },
      body: transactionDurationPercentilesRequestBody,
    }
  )) as {
    aggregations?: {
      transaction_duration_percentiles: {
        values: Record<string, number>;
      };
    };
  };

  if (!transactionDurationPercentilesResponse.aggregations) {
    return;
  }

  const percentilesResponseThresholds =
    transactionDurationPercentilesResponse.aggregations
      .transaction_duration_percentiles?.values ?? {};

  return percentilesResponseThresholds[`${percentileThreshold}.0`];
}
