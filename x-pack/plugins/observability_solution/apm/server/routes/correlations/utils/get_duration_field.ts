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
} from '../../../../common/es_fields/apm';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';

const {
  transactionLatency,
  latencyCorrelations,
  failedTransactionsCorrelations,
  dependencyLatency,
} = LatencyDistributionChartType;

export function getDurationField(
  chartType: LatencyDistributionChartType,
  searchMetrics: boolean
) {
  switch (chartType) {
    case transactionLatency:
      if (searchMetrics) {
        return TRANSACTION_DURATION_HISTOGRAM;
      }
      return TRANSACTION_DURATION;
    case latencyCorrelations:
      return TRANSACTION_DURATION;
    case failedTransactionsCorrelations:
      return TRANSACTION_DURATION;
    case dependencyLatency:
      return SPAN_DURATION;
    default:
      return TRANSACTION_DURATION;
  }
}
