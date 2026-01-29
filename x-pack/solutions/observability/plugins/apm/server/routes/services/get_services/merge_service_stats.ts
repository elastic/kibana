/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';
import type { ServiceAnomalyHealthStatusesResponse } from './get_health_statuses';
import type { ServiceAlertsResponse } from './get_service_alerts';
import type { ServiceSloStatsResponse } from './get_services_slo_stats';
import type { ServiceTransactionStatsResponse } from './get_service_transaction_stats';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import type { ServiceHealthStatus } from '../../../../common/service_health_status';
import { calculateCombinedHealthStatus } from '../../../../common/service_health_status';
import type { SloStatus, ServiceAlertsSeverity } from '../../../../common/service_inventory';

export interface MergedServiceStat {
  serviceName: string;
  transactionType?: string;
  environments?: string[];
  agentName?: AgentName;
  latency?: number | null;
  transactionErrorRate?: number;
  throughput?: number;
  anomalyHealthStatus?: ServiceHealthStatus; // ML anomaly detection health status
  combinedHealthStatus?: ServiceHealthStatus; // Combined health from alerts, SLOs, and anomalies
  alertsCount?: number;
  alertsSeverity?: ServiceAlertsSeverity;
  sloStatus?: SloStatus;
  sloCount?: number;
}

export function mergeServiceStats({
  serviceStats,
  anomalyHealthStatuses,
  alertCounts,
  sloStats,
}: {
  serviceStats: ServiceTransactionStatsResponse['serviceStats'];
  anomalyHealthStatuses: ServiceAnomalyHealthStatusesResponse;
  alertCounts: ServiceAlertsResponse;
  sloStats: ServiceSloStatsResponse;
}): MergedServiceStat[] {
  const allServiceNames = serviceStats.map(({ serviceName }) => serviceName);

  // Make sure to exclude anomaly health statuses from services
  // that are not found in APM data (e.g., wildcard "*" services from SLO alerts)
  const matchedAnomalyHealthStatuses = anomalyHealthStatuses.filter(({ serviceName }) =>
    allServiceNames.includes(serviceName)
  );

  // Make sure to exclude alerts from services
  // that are not found in APM data (e.g., wildcard "*" services from SLO alerts)
  const matchedAlertCounts = alertCounts.filter(({ serviceName }) =>
    allServiceNames.includes(serviceName)
  );

  // make sure to exclude SLO stats from services
  // that are not found in APM data
  const matchedSloStats = sloStats.filter(({ serviceName }) =>
    allServiceNames.includes(serviceName)
  );

  const mergedStats = joinByKey(
    asMutableArray([
      ...serviceStats,
      ...matchedAnomalyHealthStatuses,
      ...matchedAlertCounts,
      ...matchedSloStats,
    ] as const),
    'serviceName',
    function merge(a, b) {
      const aEnvs = 'environments' in a ? a.environments : [];
      const bEnvs = 'environments' in b ? b.environments : [];
      const agentNameA = 'agentName' in a ? a?.agentName : undefined;
      const agentNameB = 'agentName' in b ? b?.agentName : undefined;
      return {
        ...a,
        ...b,
        ...{ agentName: agentNameA || agentNameB },
        environments: [...new Set(aEnvs.concat(bEnvs))],
      };
    }
  );

  // Calculate combined health status for each service
  return mergedStats.map((service): MergedServiceStat => {
    const mergedService = service as MergedServiceStat;
    return {
      ...mergedService,
      combinedHealthStatus: calculateCombinedHealthStatus({
        alertsSeverity: mergedService.alertsSeverity,
        sloStatus: mergedService.sloStatus,
        anomalyHealthStatus: mergedService.anomalyHealthStatus,
      }),
    };
  });
}
