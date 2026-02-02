/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServicesResponse } from '../../../common/service_map/types';
import type { ServiceAnomaliesResponse } from './get_service_anomalies';
import type { ServiceAlertsResponse } from '../services/get_services/get_service_alerts';
import type { ServiceSloStatsResponse } from '../services/get_services/get_services_slo_stats';
import { getSeverity } from '../../../common/anomaly_detection';
import {
  getServiceHealthStatus,
  calculateCombinedHealthStatus,
} from '../../../common/service_health_status';

export function mergeServiceMapData({
  servicesData,
  anomalies,
  alertCounts,
  sloStats,
}: {
  servicesData: ServicesResponse[];
  anomalies: ServiceAnomaliesResponse;
  alertCounts: ServiceAlertsResponse;
  sloStats: ServiceSloStatsResponse;
}): ServicesResponse[] {
  // Create lookup maps for efficient merging
  const anomalyMap = new Map(
    anomalies.serviceAnomalies.map((anomaly) => {
      const severity = getSeverity(anomaly.anomalyScore);
      const anomalyHealthStatus = getServiceHealthStatus({ severity });
      return [anomaly.serviceName, anomalyHealthStatus];
    })
  );

  const alertsMap = new Map(
    alertCounts.map((alert) => [
      alert.serviceName,
      {
        alertsCount: alert.alertsCount,
        alertsSeverity: alert.severity,
      },
    ])
  );

  const sloMap = new Map(
    sloStats.map((slo) => [
      slo.serviceName,
      {
        sloStatus: slo.sloStatus,
        sloCount: slo.sloCount,
      },
    ])
  );

  // Merge all data for each service
  return servicesData.map((service) => {
    const serviceName = service['service.name'];
    const anomalyHealthStatus = anomalyMap.get(serviceName);
    const alertData = alertsMap.get(serviceName);
    const sloData = sloMap.get(serviceName);

    // Calculate combined health status from all signals
    const combinedHealthStatus = calculateCombinedHealthStatus({
      alertsSeverity: alertData?.alertsSeverity,
      sloStatus: sloData?.sloStatus,
      anomalyHealthStatus,
    });

    return {
      ...service,
      anomalyHealthStatus,
      combinedHealthStatus,
      alertsCount: alertData?.alertsCount ?? 0,
      alertsSeverity: alertData?.alertsSeverity ?? { critical: 0, warning: 0 },
      sloStatus: sloData?.sloStatus,
      sloCount: sloData?.sloCount ?? 0,
    };
  });
}
