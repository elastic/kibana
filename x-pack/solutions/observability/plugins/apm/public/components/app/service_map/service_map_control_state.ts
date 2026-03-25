/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceHealthStatus } from '../../../../common/service_health_status';
import {
  AGENT_NAME,
  CONTAINER_ID,
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
  HOST_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';

/**
 * APM fields available for "Group by" on the service map.
 * Sourced from the same field set used in APM alerting and docs (keyword / groupable fields).
 */
export const SERVICE_MAP_GROUP_BY_FIELDS: string[] = [
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
  SERVICE_LANGUAGE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  HOST_NAME,
  CONTAINER_ID,
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
];

export type LayoutDirection = 'horizontal' | 'vertical';

export interface ServiceMapControlState {
  /** Show only service nodes that have at least one active alert */
  showOnlyActiveAlerts: boolean;
  /** SLO statuses to include (empty = show all) */
  sloStatusFilter: SloStatus[];
  /** Anomaly/health statuses to include (empty = show all) */
  anomalyStatusFilter: ServiceHealthStatus[];
  /** Group services by this APM field (e.g. service.name); null = no grouping */
  groupBy: string | null;
  /** Layout direction for the graph */
  layoutDirection: LayoutDirection;
  /** Show SLO badge on service nodes */
  showSloBadge: boolean;
  /** Show alerts badge on service nodes */
  showAlertsBadge: boolean;
  /** Show anomaly status on service nodes */
  showAnomalyBadge: boolean;
}

export const DEFAULT_SERVICE_MAP_CONTROL_STATE: ServiceMapControlState = {
  showOnlyActiveAlerts: false,
  sloStatusFilter: [],
  anomalyStatusFilter: [],
  groupBy: null,
  layoutDirection: 'horizontal',
  showSloBadge: true,
  showAlertsBadge: true,
  showAnomalyBadge: true,
};
