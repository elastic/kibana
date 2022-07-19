/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export enum LATENCY_DISTRIBUTION_CHART_TYPE {
  TRANSACTION_DETAILS = 'TRANSACTION_DETAILS',
  LATENCY_CORRELATIONS = 'LATENCY_CORRELATIONS',
  FAILED_TRANSACTIONS_CORRELATIONS = 'FAILED_TRANSACTIONS_CORRELATIONS',
  DEPENDENCY_LATENCY_DISTRIBUTION = 'DEPENDENCY_LATENCY_DISTRIBUTION',
}
export const latencyDistributionChartTypeRt = t.union([
  t.literal(LATENCY_DISTRIBUTION_CHART_TYPE.TRANSACTION_DETAILS),
  t.literal(LATENCY_DISTRIBUTION_CHART_TYPE.LATENCY_CORRELATIONS),
  t.literal(LATENCY_DISTRIBUTION_CHART_TYPE.FAILED_TRANSACTIONS_CORRELATIONS),
  t.literal(LATENCY_DISTRIBUTION_CHART_TYPE.DEPENDENCY_LATENCY_DISTRIBUTION),
]);
