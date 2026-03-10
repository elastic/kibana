/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export enum LatencyDistributionChartType {
  transactionLatency = 'transactionLatency',
  spanLatency = 'spanLatency',
  latencyCorrelations = 'latencyCorrelations',
  failedTransactionsCorrelations = 'failedTransactionsCorrelations',
  dependencyLatency = 'dependencyLatency',
  /** Exit span latency correlations (outgoing requests to dependencies) */
  exitSpanLatencyCorrelations = 'exitSpanLatencyCorrelations',
  /** Exit span failed transaction rate correlations */
  exitSpanFailedTransactionsCorrelations = 'exitSpanFailedTransactionsCorrelations',
}
export const latencyDistributionChartTypeRt = t.union([
  t.literal(LatencyDistributionChartType.transactionLatency),
  t.literal(LatencyDistributionChartType.spanLatency),
  t.literal(LatencyDistributionChartType.latencyCorrelations),
  t.literal(LatencyDistributionChartType.failedTransactionsCorrelations),
  t.literal(LatencyDistributionChartType.dependencyLatency),
  t.literal(LatencyDistributionChartType.exitSpanLatencyCorrelations),
  t.literal(LatencyDistributionChartType.exitSpanFailedTransactionsCorrelations),
]);
