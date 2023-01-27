/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { getServicesAlerts } from './get_service_alerts';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesFromErrorAndMetricDocuments } from './get_services_from_error_and_metric_documents';
import { getServiceStats } from './get_service_stats';

export function mergeServiceStats({
  transactionStats,
  servicesFromErrorAndMetricDocuments,
  healthStatuses,
  alertCounts,
}: {
  transactionStats: Awaited<ReturnType<typeof getServiceStats>>;
  servicesFromErrorAndMetricDocuments: Awaited<
    ReturnType<typeof getServicesFromErrorAndMetricDocuments>
  >['services'];
  healthStatuses: Awaited<ReturnType<typeof getHealthStatuses>>;
  alertCounts: Awaited<ReturnType<typeof getServicesAlerts>>;
}) {
  const foundServiceNames = transactionStats.map(
    ({ serviceName }) => serviceName
  );

  const servicesWithOnlyMetricDocuments =
    servicesFromErrorAndMetricDocuments.filter(
      ({ serviceName }) => !foundServiceNames.includes(serviceName)
    );

  const allServiceNames = foundServiceNames.concat(
    servicesWithOnlyMetricDocuments.map(({ serviceName }) => serviceName)
  );

  // make sure to exclude health statuses from services
  // that are not found in APM data
  const matchedHealthStatuses = healthStatuses.filter(({ serviceName }) =>
    allServiceNames.includes(serviceName)
  );

  return joinByKey(
    asMutableArray([
      ...transactionStats,
      ...servicesFromErrorAndMetricDocuments,
      ...matchedHealthStatuses,
      ...alertCounts,
    ] as const),
    'serviceName',
    function merge(a, b) {
      const aEnvs = 'environments' in a ? a.environments : [];
      const bEnvs = 'environments' in b ? b.environments : [];

      return {
        ...a,
        ...b,
        environments: uniq(aEnvs.concat(bEnvs)),
      };
    }
  );
}
