/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_EBT_ACTIONS = {
  EXPLORE_TRACES: 'exploreTraces',
  SET_ENVIRONMENT: 'setEnvironment',
  SET_TRANSACTION_TYPE: 'setTransactionType',
  SET_LATENCY_AGGREGATION_TYPE: 'setLatencyAggregationType',
  EXPLORE_SERVICE_MAP: 'exploreServiceMap',
  /** User intends to view service metadata from a logo/icon badge popover. */
  VIEW_SERVICE_METADATA: 'viewServiceMetadata',
} as const;

export const SERVICE_HEADER_EBT_ELEMENTS = {
  ALERTS_BADGE: 'serviceHeaderAlertsBadge',
  SLO_BADGE: 'serviceHeaderSloBadge',
  ANOMALIES_BADGE: 'serviceHeaderAnomaliesBadge',
  ICON_BADGE: 'serviceHeaderIconBadge',
} as const;

export const SERVICE_INVENTORY_EBT_ELEMENTS = {
  ROW_ACTIONS: 'servicesTableRowActions',
  ALERTS_BADGE: 'serviceInventoryAlertsBadge',
  SLO_BADGE: 'serviceInventorySloBadge',
  ANOMALIES_BADGE: 'serviceInventoryAnomaliesBadge',
} as const;
