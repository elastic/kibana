/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export enum LatencyDistributionChartType {
  traceSamples = 'traceSamples',
  latencyCorrelations = 'latencyCorrelations',
  failedTransactionsCorrelations = 'failedTransactionsCorrelations',
  dependencyLatencyDistribution = 'dependencyLatencyDistribution',
}
export const latencyDistributionChartTypeRt = t.union([
  t.literal(LatencyDistributionChartType.traceSamples),
  t.literal(LatencyDistributionChartType.latencyCorrelations),
  t.literal(LatencyDistributionChartType.failedTransactionsCorrelations),
  t.literal(LatencyDistributionChartType.dependencyLatencyDistribution),
]);
