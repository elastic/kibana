/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LATENCY_DISTRIBUTION_CHART_TYPE } from '../../../../common/latency_distribution_chart_types';
import { ProcessorEvent } from '../../../../common/processor_event';

const {
  TRANSACTION_DETAILS,
  LATENCY_CORRELATIONS,
  FAILED_TRANSACTIONS_CORRELATIONS,
  DEPENDENCY_LATENCY_DISTRIBUTION,
} = LATENCY_DISTRIBUTION_CHART_TYPE;

export function getEventType(
  chartType: LATENCY_DISTRIBUTION_CHART_TYPE,
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
