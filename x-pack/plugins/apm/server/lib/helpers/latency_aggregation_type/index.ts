/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { LatencyAggregationTypes } from '../../../../common/latency_aggregation_types';

export const latencyAggregationTypeRt = t.union([
  t.literal('avg'),
  t.literal('p95'),
  t.literal('p99'),
]);

export function getLatencyAggregation(
  latencyAggregationType: LatencyAggregationTypes,
  field: string
) {
  return {
    latency: {
      ...(latencyAggregationType === 'avg'
        ? { avg: { field } }
        : {
            percentiles: {
              field,
              percents: [latencyAggregationType === 'p95' ? 95 : 99],
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
