/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';

const {
  transactionLatency,
  latencyCorrelations,
  failedTransactionsCorrelations,
  dependencyLatency,
} = LatencyDistributionChartType;

export function getEventType(
  chartType: LatencyDistributionChartType,
  searchMetrics: boolean
): ProcessorEvent {
  switch (chartType) {
    case transactionLatency:
      if (searchMetrics) {
        return ProcessorEvent.metric;
      }
      return ProcessorEvent.transaction;
    case latencyCorrelations:
      return ProcessorEvent.transaction;
    case failedTransactionsCorrelations:
      return ProcessorEvent.transaction;
    case dependencyLatency:
      return ProcessorEvent.span;
    default:
      return ProcessorEvent.transaction;
  }
}
