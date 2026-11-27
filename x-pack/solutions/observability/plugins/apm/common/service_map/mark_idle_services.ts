/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { getSeverity } from '../anomaly_detection';
import type { ServiceMapNode, ServiceNodeData } from './types';
import { isServiceNodeData } from './types';
import {
  FAILURE_RATE_DANGER,
  IDLE_SHARE_OF_MEDIAN,
  MIN_REQUESTS_FOR_FAILURE_RATE,
} from './constants';

/**
 * Quiet healthy services can fade; failing, alerting, SLO-breaching, or strongly anomalous
 * services stay sharp even when their throughput is low.
 */
export function shouldKeepVisibleDespiteLowTraffic(data: ServiceNodeData): boolean {
  const { stats, alertsCount, sloStatus, serviceAnomalyStats } = data;

  if (
    (stats?.failedTransactionRate ?? 0) >= FAILURE_RATE_DANGER &&
    (stats?.requestCount ?? 0) >= MIN_REQUESTS_FOR_FAILURE_RATE
  ) {
    return true;
  }

  if (alertsCount !== undefined && alertsCount > 0) {
    return true;
  }

  if (sloStatus === 'violated' || sloStatus === 'degrading') {
    return true;
  }

  const severity = getSeverity(serviceAnomalyStats?.anomalyScore);
  return severity === ML_ANOMALY_SEVERITY.CRITICAL || severity === ML_ANOMALY_SEVERITY.MAJOR;
}

/**
 * Marks services whose throughput is far below the map's median as idle, so the map draws them
 * faded. Relative to this map's typical service — not a fixed rate — so a quiet estate does not
 * fade everything. Services that are failing, alerting, SLO-breaching, or major/critical
 * anomalous are not faded (alert/SLO badges may clear idle again after they merge).
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

  return nodes.map((node) => {
    if (
      !isServiceNodeData(node.data) ||
      typeof node.data.stats?.throughput !== 'number' ||
      node.data.stats.throughput >= threshold ||
      shouldKeepVisibleDespiteLowTraffic(node.data)
    ) {
      return node;
    }

    const data: ServiceNodeData = { ...node.data, isIdle: true };
    return { ...node, data };
  });
}
