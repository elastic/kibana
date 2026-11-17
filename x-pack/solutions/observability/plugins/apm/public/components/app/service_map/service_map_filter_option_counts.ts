/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertStatus } from '@kbn/rule-data-utils';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_DELAYED,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { SloStatus } from '../../../../common/service_inventory';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  ServiceGroupNodeData,
  ServiceNodeData,
} from '../../../../common/service_map';
import { isServiceGroupNodeData, isServiceNodeData } from '../../../../common/service_map';
import {
  getMlSeverityForServiceMapNode,
  getNormalizedSloStatusForMapFilters,
  getServiceNodeAlertCountForStatus,
  buildConnectedNodeIdSet,
} from './apply_service_map_visibility';

const ALERT_STATUSES: AlertStatus[] = [
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_STATUS_DELAYED,
];

type FilterableNodeData = ServiceNodeData | ServiceGroupNodeData;

/** Services and closed groups both carry the badge fields used by map filters. */
function getFilterableNodeData(node: ServiceMapNode): FilterableNodeData | undefined {
  if (isServiceNodeData(node.data) || isServiceGroupNodeData(node.data)) {
    return node.data;
  }
  return undefined;
}

/** Count services/groups that have ≥1 alert in each status. */
function getAlertStatusServiceCounts(
  filterableData: FilterableNodeData[]
): Record<AlertStatus, number> {
  const counts: Record<AlertStatus, number> = {
    [ALERT_STATUS_ACTIVE]: 0,
    [ALERT_STATUS_RECOVERED]: 0,
    [ALERT_STATUS_UNTRACKED]: 0,
    [ALERT_STATUS_DELAYED]: 0,
  };
  for (const data of filterableData) {
    for (const status of ALERT_STATUSES) {
      if (getServiceNodeAlertCountForStatus(data, status) > 0) {
        counts[status]++;
      }
    }
  }
  return counts;
}

/** Count services/groups by SLO status (see `getNormalizedSloStatusForMapFilters`). */
function getSloStatusCounts(filterableData: FilterableNodeData[]): Record<SloStatus, number> {
  const counts: Record<SloStatus, number> = {
    healthy: 0,
    degrading: 0,
    violated: 0,
    noData: 0,
  };
  for (const data of filterableData) {
    const status = getNormalizedSloStatusForMapFilters(data);
    counts[status]++;
  }
  return counts;
}

/** Count services/groups by ML anomaly severity band (from anomaly score). */
function getAnomalySeverityCounts(
  filterableData: FilterableNodeData[]
): Record<ML_ANOMALY_SEVERITY, number> {
  const counts: Record<ML_ANOMALY_SEVERITY, number> = {
    [ML_ANOMALY_SEVERITY.CRITICAL]: 0,
    [ML_ANOMALY_SEVERITY.MAJOR]: 0,
    [ML_ANOMALY_SEVERITY.MINOR]: 0,
    [ML_ANOMALY_SEVERITY.WARNING]: 0,
    [ML_ANOMALY_SEVERITY.LOW]: 0,
    [ML_ANOMALY_SEVERITY.UNKNOWN]: 0,
  };
  for (const data of filterableData) {
    const severity = getMlSeverityForServiceMapNode(data);
    counts[severity]++;
  }
  return counts;
}

export interface ConnectionCounts {
  orphaned: number;
  connected: number;
}

export interface ServiceMapFilterOptionCounts {
  alerts: Record<AlertStatus, number>;
  slo: Record<SloStatus, number>;
  anomaly: Record<ML_ANOMALY_SEVERITY, number>;
  connection: ConnectionCounts;
  totalServiceNodes: number;
}

/** Count nodes by connection bucket. */
function getConnectionCounts(
  allNodes: ServiceMapNode[],
  edges: ServiceMapEdge[]
): ConnectionCounts {
  const connectedIds = buildConnectedNodeIdSet(edges);
  const counts: ConnectionCounts = { orphaned: 0, connected: 0 };
  for (const node of allNodes) {
    if (connectedIds.has(node.id)) {
      counts.connected++;
    } else {
      counts.orphaned++;
    }
  }
  return counts;
}

/**
 * Aggregates per-status counts from the **unfiltered** map nodes (services and closed
 * groups) so filter options can show count badges.
 */
export function computeServiceMapFilterOptionCounts(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[]
): ServiceMapFilterOptionCounts {
  const filterableData = nodes.flatMap((node) => {
    const data = getFilterableNodeData(node);
    return data ? [data] : [];
  });

  return {
    alerts: getAlertStatusServiceCounts(filterableData),
    slo: getSloStatusCounts(filterableData),
    anomaly: getAnomalySeverityCounts(filterableData),
    connection: getConnectionCounts(nodes, edges),
    totalServiceNodes: filterableData.length,
  };
}
