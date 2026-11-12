/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ServiceGroupingSource, ServiceMapGrouping } from '../../../../common/service_map';

/**
 * Count line for the map, e.g. "20 services in 3 groups, by name prefix".
 * `groupCount` is closed groups only (2+ members) — same nodes drawn as group squares.
 * Groups of 1 stay service nodes and are not counted here.
 */
export function formatServiceGroupingCountLine(grouping: ServiceMapGrouping): string | undefined {
  const strategy = grouping.strategies.find((s) => s.source === grouping.automatic);
  if (!strategy) {
    return undefined;
  }

  const memberCounts = strategy.groups.map(() => 0);
  for (const groupIndex of strategy.assignment) {
    if (groupIndex >= 0 && groupIndex < memberCounts.length) {
      memberCounts[groupIndex] += 1;
    }
  }
  const closedGroupCount = memberCounts.filter((count) => count >= 2).length;

  return i18n.translate('xpack.apm.serviceMap.groupingCountLine', {
    defaultMessage:
      '{serviceCount} {serviceCount, plural, one {service} other {services}} in {groupCount} {groupCount, plural, one {group} other {groups}}, by {groupingBy}',
    values: {
      serviceCount: grouping.services.length,
      groupCount: closedGroupCount,
      groupingBy: formatServiceGroupingSource(grouping.automatic),
    },
  });
}

function formatServiceGroupingSource(source: ServiceGroupingSource): string {
  switch (source) {
    case 'calls':
      return i18n.translate('xpack.apm.serviceMap.groupingSource.calls', {
        defaultMessage: 'calls between services',
      });
    case 'service.namespace':
      return i18n.translate('xpack.apm.serviceMap.groupingSource.serviceNamespace', {
        defaultMessage: 'service.namespace',
      });
    case 'kubernetes.namespace':
      return i18n.translate('xpack.apm.serviceMap.groupingSource.kubernetesNamespace', {
        defaultMessage: 'kubernetes.namespace',
      });
    case 'namePrefix':
      return i18n.translate('xpack.apm.serviceMap.groupingSource.namePrefix', {
        defaultMessage: 'name prefix',
      });
    case 'serviceGroups':
      return i18n.translate('xpack.apm.serviceMap.groupingSource.serviceGroups', {
        defaultMessage: 'service groups',
      });
  }
}
