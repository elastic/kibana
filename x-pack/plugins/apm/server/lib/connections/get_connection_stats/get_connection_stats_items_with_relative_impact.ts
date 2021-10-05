/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import {
  ConnectionStatsItem,
  ConnectionStatsItemWithImpact,
} from '../../../../common/connections';

export function getConnectionStatsItemsWithRelativeImpact(
  items: ConnectionStatsItem[]
) {
  const latencySums = items
    .map(
      ({ stats }) => (stats.latency.value ?? 0) * (stats.throughput.value ?? 0)
    )
    .filter(isFiniteNumber);

  const minLatencySum = Math.min(...latencySums);
  const maxLatencySum = Math.max(...latencySums);

  const itemsWithImpact: ConnectionStatsItemWithImpact[] = items.map((item) => {
    const { stats } = item;
    const impact =
      isFiniteNumber(stats.latency.value) &&
      isFiniteNumber(stats.throughput.value)
        ? ((stats.latency.value * stats.throughput.value - minLatencySum) /
            (maxLatencySum - minLatencySum)) *
          100
        : 0;

    return {
      ...item,
      stats: {
        ...stats,
        impact,
      },
    };
  });

  return itemsWithImpact;
}
