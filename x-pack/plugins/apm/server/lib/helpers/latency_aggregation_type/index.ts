/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';

export function getLatencyAggregation(
  latencyAggregationType: LatencyAggregationType,
  field: string
) {
  return {
    latency: {
      ...(latencyAggregationType === LatencyAggregationType.avg
        ? { avg: { field } }
        : {
            percentiles: {
              field,
              percents: [
                latencyAggregationType === LatencyAggregationType.p95 ? 95 : 99,
              ],
            },
          }),
    },
  };
}

export function getLatencyValue(
  aggregation:
    | { value: number | null }
    | { values: Record<string, number | null> }
) {
  if ('value' in aggregation) {
    return aggregation.value;
  }
  if ('values' in aggregation) {
    const { '99.0': p99, '95.0': p95 } = aggregation.values;
    return p99 ?? p95;
  }

  return null;
}
