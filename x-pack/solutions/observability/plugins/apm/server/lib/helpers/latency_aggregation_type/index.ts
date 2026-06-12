/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
              percents: [latencyAggregationType === LatencyAggregationType.p95 ? 95 : 99],
            },
          }),
    },
  };
}

export function getLatencyValue({
  latencyAggregationType,
  aggregation,
}: {
  latencyAggregationType: LatencyAggregationType;
  aggregation: { value: number | null } | { values: Record<string, number | null> };
}) {
  if ('value' in aggregation) {
    return aggregation.value;
  }
  if ('values' in aggregation) {
    if (latencyAggregationType === LatencyAggregationType.p95) {
      return aggregation.values['95.0'];
    }

    if (latencyAggregationType === LatencyAggregationType.p99) {
      return aggregation.values['99.0'];
    }
  }

  return null;
}
