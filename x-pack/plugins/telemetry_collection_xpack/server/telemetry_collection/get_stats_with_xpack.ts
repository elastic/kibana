/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatsGetter } from '@kbn/telemetry-collection-manager-plugin/server';
import { TelemetryLocalStats, getLocalStats } from '@kbn/telemetry-plugin/server';
import { getXPackUsage } from './get_xpack';
import { ESLicense, getLicenseFromLocalOrMaster } from './get_license';
import { isClusterOptedIn } from './is_cluster_opted_in';

export type TelemetryAggregatedStats = TelemetryLocalStats & {
  stack_stats: { xpack?: object };
  license?: ESLicense;
};

export const getStatsWithXpack: StatsGetter<TelemetryAggregatedStats> = async function (
  clustersDetails,
  config,
  context
) {
  const { esClient } = config;
  const [clustersLocalStats, license, xpack] = await Promise.all([
    getLocalStats(clustersDetails, config, context),
    getLicenseFromLocalOrMaster(esClient),
    getXPackUsage(esClient).catch(() => undefined), // We want to still report something (and do not lose the license) even when this method fails.
  ]);

  return clustersLocalStats
    .map((localStats) => {
      const localStatsWithLicense: TelemetryAggregatedStats = {
        ...localStats,
        ...(license && { license }),
      };
      if (xpack) {
        return {
          ...localStatsWithLicense,
          stack_stats: { ...localStatsWithLicense.stack_stats, xpack },
        };
      }

      return localStatsWithLicense;
    })
    .reduce((acc, stats) => {
      // Concatenate the telemetry reported via monitoring as additional payloads instead of reporting it inside of stack_stats.kibana.plugins.monitoringTelemetry
      const monitoringTelemetry = stats.stack_stats.kibana?.plugins?.monitoringTelemetry?.stats as
        | TelemetryAggregatedStats[]
        | undefined;
      if (monitoringTelemetry) {
        delete stats.stack_stats.kibana!.plugins.monitoringTelemetry;
      }

      // From the monitoring-sourced telemetry, we need to filter out the clusters that are opted-out.
      const onlyOptedInMonitoringClusters = (monitoringTelemetry || []).filter(isClusterOptedIn);

      return [...acc, stats, ...onlyOptedInMonitoringClusters];
    }, [] as TelemetryAggregatedStats[]);
};
