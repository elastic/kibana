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
  getServiceAnomaliesHealthStatus,
  calculateCombinedHealthStatus,
  ServiceHealthStatus,
} from '../../../common/service_health_status';

/**
 * Calculate combined health status for all services in the service map.
 * Returns an array of health statuses that can be looked up by service name.
 * This matches the pattern used for anomalies (top-level arrays).
 */
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
}): Array<{ serviceName: string; combinedHealthStatus: ServiceHealthStatus }> {
  try {
    // Collect all unique service names from all sources
    const allServiceNames = new Set<string>();
    servicesData.forEach((service) => allServiceNames.add(service['service.name']));
    anomalies.serviceAnomalies.forEach((anomaly) => allServiceNames.add(anomaly.serviceName));
    alertCounts.forEach((alert) => allServiceNames.add(alert.serviceName));
    sloStats.forEach((slo) => allServiceNames.add(slo.serviceName));

    // Create lookup maps for efficient access
    const anomalyMap = new Map(
      anomalies.serviceAnomalies.map((anomaly) => {
        const severity = getSeverity(anomaly.anomalyScore);
        const anomalyHealthStatus = getServiceAnomaliesHealthStatus({ severity });
        return [anomaly.serviceName, anomalyHealthStatus];
      })
    );

    const alertsMap = new Map(
      alertCounts.map((alert) => [alert.serviceName, alert.alertsSeverity])
    );

    const sloMap = new Map(sloStats.map((slo) => [slo.serviceName, slo.sloStatus]));

    // Calculate combined health for all services
    return Array.from(allServiceNames).map((serviceName) => {
      try {
        const anomalyHealthStatus = anomalyMap.get(serviceName);
        const alertsSeverity = alertsMap.get(serviceName);
        const sloStatus = sloMap.get(serviceName);

        const combinedHealthStatus = calculateCombinedHealthStatus({
          alertsSeverity,
          sloStatus,
          anomalyHealthStatus,
        });

        return {
          serviceName,
          combinedHealthStatus,
        };
      } catch (error) {
        // If calculation fails for individual service, return unknown status
        return {
          serviceName,
          combinedHealthStatus: ServiceHealthStatus.unknown,
        };
      }
    });
  } catch (error) {
    // If entire operation fails, return empty array
    return [];
  }
}
