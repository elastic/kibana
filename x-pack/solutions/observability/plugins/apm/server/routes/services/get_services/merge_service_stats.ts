/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MergedServiceStat, ServiceAlertsResponse } from '@kbn/apm-api-shared';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';
import type { ServiceAnomalyScoresResponse } from './get_service_anomaly_scores';
import type { ServiceSloStatsResponse } from './get_services_slo_stats';
import type { ServiceTransactionStatsResponse } from './get_service_transaction_stats';

export function mergeServiceStats({
  serviceStats,
  anomalyScores,
  alertCounts,
  sloStats,
}: {
  serviceStats: ServiceTransactionStatsResponse['serviceStats'];
  anomalyScores: ServiceAnomalyScoresResponse;
  alertCounts: ServiceAlertsResponse;
  sloStats: ServiceSloStatsResponse;
}): MergedServiceStat[] {
  const allServiceNames = serviceStats.map(({ serviceName }) => serviceName);

  // Make sure to exclude anomaly scores, alerts, and SLO stats from services
  // that are not found in APM data (e.g., wildcard "*" services from SLO alerts)
  const matchedAnomalyScores = anomalyScores.filter(({ serviceName }) =>
    allServiceNames.includes(serviceName)
  );

  const matchedAlertCounts = alertCounts.filter(({ serviceName }) =>
    allServiceNames.includes(serviceName)
  );

  const matchedSloStats = sloStats.filter(({ serviceName }) =>
    allServiceNames.includes(serviceName)
  );

  return joinByKey(
    asMutableArray([
      ...serviceStats,
      ...matchedAnomalyScores,
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
}
