/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonCorrelationsQueryParams } from '../../../common/correlations/types';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { fetchDurationPercentiles } from '../correlations/queries/fetch_duration_percentiles';

export async function getPercentileThresholdValue({
  setup,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  percentileThreshold,
}: CommonCorrelationsQueryParams & {
  setup: Setup;
  eventType: ProcessorEvent;
  percentileThreshold: number;
}) {
  const durationPercentiles = await fetchDurationPercentiles({
    setup,
    eventType,
    start,
    end,
    environment,
    kuery,
    query,
  });

  return durationPercentiles.percentiles[`${percentileThreshold}.0`];
}
