/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StatsGetter } from 'src/plugins/telemetry_collection_manager/server';
import { TelemetryLocalStats, getLocalStats } from '../../../../../src/plugins/telemetry/server';
import { getXPackUsage } from './get_xpack';
import { ESLicense, getLicenseFromLocalOrMaster } from './get_license';

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
      const monitoringTelemetry = stats.stack_stats.kibana?.plugins?.monitoringTelemetry;
      if (monitoringTelemetry) {
        delete stats.stack_stats.kibana!.plugins.monitoringTelemetry;
      }
      return [...acc, stats, ...(monitoringTelemetry || [])];
    }, [] as TelemetryAggregatedStats[]);
};
