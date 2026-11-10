/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceTransactionGroupAlertsResponse } from '../services/get_service_transaction_groups_alerts';
import type { ServiceTransactionGroupsResponse } from '../services/get_service_transaction_groups';

/**
 * Decorates kuery-filtered transaction stats with alert counts.
 * Alerts ignore page kuery, so only matching names are merged — alert-only
 * groups must not reappear as incomplete table rows.
 */
export function mergeTransactionGroupsWithAlerts({
  transactionGroups,
  alerts,
}: {
  transactionGroups: ServiceTransactionGroupsResponse['transactionGroups'];
  alerts: ServiceTransactionGroupAlertsResponse;
}): {
  transactionGroups: ServiceTransactionGroupsResponse['transactionGroups'];
  hasActiveAlerts: boolean;
} {
  const alertsCountByName = new Map(
    alerts.map(({ name, alertsCount }): [string, number] => [name, alertsCount])
  );

  let hasActiveAlerts = false;
  const mergedTransactionGroups = transactionGroups.map((group) => {
    const alertsCount = alertsCountByName.get(group.name) ?? group.alertsCount;
    if (alertsCount > 0) {
      hasActiveAlerts = true;
    }
    return { ...group, alertsCount };
  });

  return {
    transactionGroups: mergedTransactionGroups,
    hasActiveAlerts,
  };
}
