/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LatencyCorrelationsResponse } from '../../../../../common/correlations/latency_correlations/types';

import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

// `isRunning` refers to the search strategy as whole which might still be in the process
// of fetching more data such as correlation results. That's why we have to determine
// the `status` of the data for the latency chart separately.
export function getOverallHistogram(
  data: LatencyCorrelationsResponse,
  isRunning: boolean
) {
  const overallHistogram =
    data.overallHistogram === undefined && !isRunning
      ? []
      : data.overallHistogram;
  const hasData =
    Array.isArray(overallHistogram) && overallHistogram.length > 0;
  const status = Array.isArray(overallHistogram)
    ? FETCH_STATUS.SUCCESS
    : FETCH_STATUS.LOADING;

  return { overallHistogram, hasData, status };
}
