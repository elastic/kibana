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
import type { ServiceMapNode, ServiceNodeData } from '../../../../common/service_map';
import { isServiceNodeData } from '../../../../common/service_map';
import {
  getMlSeverityForServiceMapNode,
  getNormalizedSloStatusForMapFilters,
  getServiceNodeAlertCountForStatus,
} from './apply_service_map_visibility';

const ALERT_STATUSES: AlertStatus[] = [
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_STATUS_DELAYED,
];

/** Count services that have ≥1 alert in each status. */
function getAlertStatusServiceCounts(serviceNodes: ServiceMapNode[]): Record<AlertStatus, number> {
  const counts: Record<AlertStatus, number> = {
    [ALERT_STATUS_ACTIVE]: 0,
    [ALERT_STATUS_RECOVERED]: 0,
    [ALERT_STATUS_UNTRACKED]: 0,
    [ALERT_STATUS_DELAYED]: 0,
  };
  for (const node of serviceNodes) {
    if (node.type !== 'service' || !isServiceNodeData(node.data)) continue;
    const serviceNodeData = node.data as ServiceNodeData;
    for (const status of ALERT_STATUSES) {
      if (getServiceNodeAlertCountForStatus(serviceNodeData, status) > 0) {
        counts[status]++;
      }
    }
  }
  return counts;
}

/** Count services by SLO status (see `getNormalizedSloStatusForMapFilters`). */
function getSloStatusCounts(serviceNodes: ServiceMapNode[]): Record<SloStatus, number> {
  const counts: Record<SloStatus, number> = {
    healthy: 0,
    degrading: 0,
    violated: 0,
    noData: 0,
  };
  for (const node of serviceNodes) {
    if (node.type !== 'service' || !isServiceNodeData(node.data)) continue;
    const status = getNormalizedSloStatusForMapFilters(node.data as ServiceNodeData);
    counts[status]++;
  }
  return counts;
}

/** Count services by ML anomaly severity band (from anomaly score), same as inventory / map coloring. */
function getAnomalySeverityCounts(
  serviceNodes: ServiceMapNode[]
): Record<ML_ANOMALY_SEVERITY, number> {
  const counts: Record<ML_ANOMALY_SEVERITY, number> = {
    [ML_ANOMALY_SEVERITY.CRITICAL]: 0,
    [ML_ANOMALY_SEVERITY.MAJOR]: 0,
    [ML_ANOMALY_SEVERITY.MINOR]: 0,
    [ML_ANOMALY_SEVERITY.WARNING]: 0,
    [ML_ANOMALY_SEVERITY.LOW]: 0,
    [ML_ANOMALY_SEVERITY.UNKNOWN]: 0,
  };
  for (const node of serviceNodes) {
    if (node.type !== 'service' || !isServiceNodeData(node.data)) continue;
    const severity = getMlSeverityForServiceMapNode(node.data as ServiceNodeData);
    counts[severity]++;
  }
  return counts;
}

export interface ServiceMapFilterOptionCounts {
  alerts: Record<AlertStatus, number>;
  slo: Record<SloStatus, number>;
  anomaly: Record<ML_ANOMALY_SEVERITY, number>;
  totalServiceNodes: number;
}

/**
 * Aggregates per-status service counts from the **unfiltered** map nodes
 * so filter options can show count badges.
 */
export function computeServiceMapFilterOptionCounts(
  nodes: ServiceMapNode[]
): ServiceMapFilterOptionCounts {
  const serviceNodes = nodes.filter((n) => n.type === 'service' && isServiceNodeData(n.data));

  return {
    alerts: getAlertStatusServiceCounts(serviceNodes),
    slo: getSloStatusCounts(serviceNodes),
    anomaly: getAnomalySeverityCounts(serviceNodes),
    totalServiceNodes: serviceNodes.length,
  };
}
