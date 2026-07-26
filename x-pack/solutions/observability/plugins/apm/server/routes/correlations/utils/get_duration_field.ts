/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DURATION,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../common/es_fields/apm';
import type { EntityType } from '../../../../common/correlations/types';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';

const {
  transactionLatency,
  latencyCorrelations,
  failedTransactionsCorrelations,
  dependencyLatency,
  spanLatency,
} = LatencyDistributionChartType;

/** Resolve duration field from correlations API entity type (no chart-type dependency). */
export function getDurationFieldFromEntityType(
  entityType: EntityType,
  isOtel: boolean = false
): string {
  return entityType === 'exit_span' ? (isOtel ? DURATION : SPAN_DURATION) : TRANSACTION_DURATION;
}

export function getDurationField(
  chartType: LatencyDistributionChartType,
  searchMetrics: boolean,
  isOtel: boolean
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
    case spanLatency:
      return isOtel ? DURATION : SPAN_DURATION;
    default:
      return TRANSACTION_DURATION;
  }
}
