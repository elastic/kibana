/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { orderBy } from 'lodash';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import type { ServiceListItem, SloStatus } from '../../../../../common/service_inventory';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';

type SortValueGetter = (item: ServiceListItem) => string | number;

const SERVICE_HEALTH_STATUS_ORDER = [
  ServiceHealthStatus.unknown,
  ServiceHealthStatus.healthy,
  ServiceHealthStatus.warning,
  ServiceHealthStatus.critical,
];

// SLO status priority order: violated (highest) -> degrading -> noData -> healthy (lowest)
const SLO_STATUS_ORDER: SloStatus[] = ['healthy', 'noData', 'degrading', 'violated'];

// Multiplier to ensure status priority takes precedence over count
// e.g., 2 violated (4 * 10000 + 2 = 40002) > 100 degrading (3 * 10000 + 100 = 30100)
const SLO_STATUS_MULTIPLIER = 10000;

const sorts: Record<ServiceInventoryFieldName, SortValueGetter> = {
  [ServiceInventoryFieldName.HealthStatus]: (item) =>
    item.healthStatus ? SERVICE_HEALTH_STATUS_ORDER.indexOf(item.healthStatus) : -1,
  [ServiceInventoryFieldName.ServiceName]: (item) => item.serviceName.toLowerCase(),
  [ServiceInventoryFieldName.Environments]: (item) =>
    item.environments?.join(', ').toLowerCase() ?? '',
  [ServiceInventoryFieldName.TransactionType]: (item) => item.transactionType ?? '',
  [ServiceInventoryFieldName.Latency]: (item) => item.latency ?? -1,
  [ServiceInventoryFieldName.Throughput]: (item) => item.throughput ?? -1,
  [ServiceInventoryFieldName.TransactionErrorRate]: (item) => item.transactionErrorRate ?? -1,
  [ServiceInventoryFieldName.AlertsCount]: (item) => item.alertsCount ?? -1,
  // Composite score: status priority * multiplier + count
  // This ensures: 5 violated > 2 violated > 10 degrading > 5 degrading
  [ServiceInventoryFieldName.SloStatus]: (item) => {
    if (!item.sloStatus) return -1;
    const statusPriority = SLO_STATUS_ORDER.indexOf(item.sloStatus);
    const count = item.sloCount ?? 0;
    return statusPriority * SLO_STATUS_MULTIPLIER + count;
  },
};

/**
 * Determines the default sort field based on available data in service items.
 * Priority: alertsCount -> sloStatus -> healthStatus -> throughput
 */
export function getAvailableFields(items: ServiceListItem[]) {
  const hasAlerts = items.some((item) => item.alertsCount !== undefined && item.alertsCount > 0);
  const hasSlos = items.some((item) => item.sloStatus !== undefined);
  const hasHealthStatuses = items.some((item) => item.healthStatus !== undefined);

  const availableFields = {
    hasAlerts,
    hasSlos,
    hasHealthStatuses,
  };

  if (hasAlerts) {
    return {
      sortField: ServiceInventoryFieldName.AlertsCount,
      ...availableFields,
    };
  }

  if (hasSlos) {
    return {
      sortField: ServiceInventoryFieldName.SloStatus,
      ...availableFields,
    };
  }

  if (hasHealthStatuses) {
    return {
      sortField: ServiceInventoryFieldName.HealthStatus,
      ...availableFields,
    };
  }

  return {
    sortField: ServiceInventoryFieldName.Throughput,
    ...availableFields,
  };
}

export function orderServiceItems({
  items,
  sortField,
  sortDirection,
  isDefaultSort = false,
}: {
  items: ServiceListItem[];
  sortField: ServiceInventoryFieldName;
  sortDirection: 'asc' | 'desc';
  isDefaultSort?: boolean;
}): ServiceListItem[] {
  // Default sort: multi-level sorting (alerts -> SLO -> health -> throughput)
  // User-selected sort: sort by the selected column only
  if (isDefaultSort) {
    return orderBy(
      items,
      [
        sorts[ServiceInventoryFieldName.AlertsCount],
        sorts[ServiceInventoryFieldName.SloStatus],
        sorts[ServiceInventoryFieldName.HealthStatus],
        sorts[ServiceInventoryFieldName.Throughput],
      ],
      [sortDirection, sortDirection, sortDirection, sortDirection]
    );
  }

  // Single column sort when user explicitly selects a column
  const sortFn = sorts[sortField];
  if (!sortFn) {
    return items;
  }
  return orderBy(items, [sortFn], [sortDirection]);
}
