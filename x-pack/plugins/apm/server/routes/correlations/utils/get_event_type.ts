/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { ProcessorEvent } from '../../../../common/processor_event';

const {
  traceSamples: TRANSACTION_DETAILS,
  latencyCorrelations: LATENCY_CORRELATIONS,
  failedTransactionsCorrelations: FAILED_TRANSACTIONS_CORRELATIONS,
  dependencyLatencyDistribution: DEPENDENCY_LATENCY_DISTRIBUTION,
} = LatencyDistributionChartType;

export function getEventType(
  chartType: LatencyDistributionChartType,
  searchAggregatedTransactions = false
): ProcessorEvent {
  switch (chartType) {
    case TRANSACTION_DETAILS:
      if (searchAggregatedTransactions) {
        return ProcessorEvent.metric;
      }
      return ProcessorEvent.transaction;
    case LATENCY_CORRELATIONS:
      return ProcessorEvent.transaction;
    case FAILED_TRANSACTIONS_CORRELATIONS:
      return ProcessorEvent.transaction;
    case DEPENDENCY_LATENCY_DISTRIBUTION:
      return ProcessorEvent.span;
    default:
      return ProcessorEvent.transaction;
  }
}
