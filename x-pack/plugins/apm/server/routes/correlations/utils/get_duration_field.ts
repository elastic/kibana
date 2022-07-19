/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../common/elasticsearch_fieldnames';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';

const {
  traceSamples: TRANSACTION_DETAILS,
  latencyCorrelations: LATENCY_CORRELATIONS,
  failedTransactionsCorrelations: FAILED_TRANSACTIONS_CORRELATIONS,
  dependencyLatencyDistribution: DEPENDENCY_LATENCY_DISTRIBUTION,
} = LatencyDistributionChartType;

export function getDurationField(
  chartType: LatencyDistributionChartType,
  searchAggregatedTransactions = false
) {
  switch (chartType) {
    case TRANSACTION_DETAILS:
      if (searchAggregatedTransactions) {
        return TRANSACTION_DURATION_HISTOGRAM;
      }
      return TRANSACTION_DURATION;
    case LATENCY_CORRELATIONS:
      return TRANSACTION_DURATION;
    case FAILED_TRANSACTIONS_CORRELATIONS:
      return TRANSACTION_DURATION;
    case DEPENDENCY_LATENCY_DISTRIBUTION:
      return SPAN_DURATION;
    default:
      return TRANSACTION_DURATION;
  }
}
