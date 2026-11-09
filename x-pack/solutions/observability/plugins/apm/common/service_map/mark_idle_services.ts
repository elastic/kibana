/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from './types';
import { isServiceNodeData } from './types';
import { IDLE_SHARE_OF_MEDIAN } from './constants';

/**
 * Marks services whose throughput is far below the map's median as idle, so the map draws them
 * faded. Relative to this map's typical service — not a fixed rate — so a quiet estate does not
 * fade everything.
 */
export function markIdleServices(nodes: ServiceMapNode[]): ServiceMapNode[] {
  const rates = nodes
    .map((node) => (isServiceNodeData(node.data) ? node.data.stats?.throughput : undefined))
    .filter((rate): rate is number => typeof rate === 'number')
    .sort((a, b) => a - b);

  if (rates.length === 0) {
    return nodes;
  }

  const median = rates[Math.floor(rates.length / 2)];
  const threshold = median * IDLE_SHARE_OF_MEDIAN;

  return nodes.map((node) =>
    isServiceNodeData(node.data) &&
    typeof node.data.stats?.throughput === 'number' &&
    node.data.stats.throughput < threshold
      ? ({ ...node, data: { ...node.data, isIdle: true } } as ServiceMapNode)
      : node
  );
}
