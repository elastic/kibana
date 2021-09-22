/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_SEARCH_STRATEGIES = {
  APM_FAILED_TRANSACTIONS_CORRELATIONS: 'apmFailedTransactionsCorrelations',
  APM_LATENCY_CORRELATIONS: 'apmLatencyCorrelations',
} as const;
export type ApmSearchStrategies =
  typeof APM_SEARCH_STRATEGIES[keyof typeof APM_SEARCH_STRATEGIES];

export const DEFAULT_PERCENTILE_THRESHOLD = 95;
