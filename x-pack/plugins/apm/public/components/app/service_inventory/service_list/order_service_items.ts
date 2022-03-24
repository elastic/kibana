/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { orderBy } from 'lodash';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import {
  ServiceListItem,
  ServiceInventoryFieldName,
} from '../../../../../common/service_inventory';

type SortValueGetter = (item: ServiceListItem) => string | number;

const SERVICE_HEALTH_STATUS_ORDER = [
  ServiceHealthStatus.unknown,
  ServiceHealthStatus.healthy,
  ServiceHealthStatus.warning,
  ServiceHealthStatus.critical,
];

const sorts: Record<ServiceInventoryFieldName, SortValueGetter> = {
  [ServiceInventoryFieldName.HealthStatus]: (item) =>
    item.healthStatus
      ? SERVICE_HEALTH_STATUS_ORDER.indexOf(item.healthStatus)
      : -1,
  [ServiceInventoryFieldName.ServiceName]: (item) =>
    item.serviceName.toLowerCase(),
  [ServiceInventoryFieldName.Environments]: (item) =>
    item.environments?.join(', ').toLowerCase() ?? '',
  [ServiceInventoryFieldName.TransactionType]: (item) =>
    item.transactionType ?? '',
  [ServiceInventoryFieldName.Latency]: (item) => item.latency ?? 0,
  [ServiceInventoryFieldName.Throughput]: (item) => item.throughput ?? 0,
  [ServiceInventoryFieldName.FailureRate]: (item) =>
    item.transactionErrorRate ?? 0,
};

function reverseSortDirection(sortDirection: 'asc' | 'desc') {
  return sortDirection === 'asc' ? 'desc' : 'asc';
}

export function orderServiceItems({
  items,
  primarySortField,
  tiebreakerField,
  sortDirection,
}: {
  items: ServiceListItem[];
  primarySortField: ServiceInventoryFieldName;
  tiebreakerField: ServiceInventoryFieldName;
  sortDirection: 'asc' | 'desc';
}): ServiceListItem[] {
  // For healthStatus, sort items by healthStatus first, then by name

  const sortFn = sorts[primarySortField as ServiceInventoryFieldName];

  if (primarySortField === ServiceInventoryFieldName.HealthStatus) {
    const tiebreakerSortDirection =
      tiebreakerField === ServiceInventoryFieldName.ServiceName
        ? reverseSortDirection(sortDirection)
        : sortDirection;

    const tiebreakerSortFn = sorts[tiebreakerField];

    return orderBy(
      items,
      [sortFn, tiebreakerSortFn],
      [sortDirection, tiebreakerSortDirection]
    );
  }

  return orderBy(items, sortFn, sortDirection);
}
