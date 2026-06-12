/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailedTransactionsCorrelation } from '../../../../../common/correlations/failed_transactions_correlations/types';
import type { LatencyCorrelation } from '../../../../../common/correlations/latency_correlations/types';

export interface CorrelationsProgress {
  error?: string;
  isRunning: boolean;
  loaded: number;
}

export function getLatencyCorrelationsSortedByCorrelation(
  latencyCorrelations: LatencyCorrelation[]
) {
  return latencyCorrelations.sort((a, b) => b.correlation - a.correlation);
}

export function getFailedTransactionsCorrelationsSortedByScore(
  failedTransactionsCorrelations: FailedTransactionsCorrelation[]
) {
  return failedTransactionsCorrelations.sort((a, b) => b.score - a.score);
}

export const getInitialResponse = () => ({
  ccsWarning: false,
  isRunning: false,
  loaded: 0,
});

export const getReducer =
  <T>() =>
  (prev: T, update: Partial<T>): T => ({
    ...prev,
    ...update,
  });
