/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import {
  ConnectionMetricItem,
  ConnectionMetricItemWithImpact,
} from '../../../../common/connections';

export function getConnectionMetricItemsWithRelativeImpact(
  items: ConnectionMetricItem[]
) {
  const latencySums = items
    .map(
      ({ metrics }) =>
        (metrics.latency.value ?? 0) * (metrics.throughput.value ?? 0)
    )
    .filter(isFiniteNumber);

  const minLatencySum = Math.min(...latencySums);
  const maxLatencySum = Math.max(...latencySums);

  const itemsWithImpact: ConnectionMetricItemWithImpact[] = items.map(
    (item) => {
      const { metrics } = item;
      const impact =
        isFiniteNumber(metrics.latency.value) &&
        isFiniteNumber(metrics.throughput.value)
          ? ((metrics.latency.value * metrics.throughput.value -
              minLatencySum) /
              (maxLatencySum - minLatencySum)) *
            100
          : 0;

      return {
        ...item,
        metrics: {
          ...metrics,
          impact,
        },
      };
    }
  );

  return itemsWithImpact;
}
