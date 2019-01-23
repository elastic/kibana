/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { KIBANA_STATS_TYPE_MONITORING } from '../../../monitoring/common/constants';
import { KIBANA_SPACES_STATS_TYPE } from '../../common/constants';

/**
 *
 * @param callCluster
 * @param server
 * @param {boolean} spacesAvailable
 * @param withinDayRange
 * @return {ReportingUsageStats}
 */
async function getSpacesUsage(callCluster: any, server: any, spacesAvailable: boolean) {
  if (!spacesAvailable) {
    return {};
  }

  const { getSavedObjectsRepository } = server.savedObjects;

  const savedObjectsRepository = getSavedObjectsRepository(callCluster);

  const { saved_objects: spaces } = await savedObjectsRepository.find({ type: 'space' });

  return {
    count: spaces.length,
  };
}

export interface UsageStats {
  available: boolean;
  enabled: boolean;
  count?: number;
}
/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getSpacesUsageCollector(server: any) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_SPACES_STATS_TYPE,
    fetch: async (callCluster: any) => {
      const xpackInfo = server.plugins.xpack_main.info;
      const config = server.config();
      const available = xpackInfo && xpackInfo.isAvailable(); // some form of spaces is available for all valid licenses
      const enabled = config.get('xpack.spaces.enabled');
      const spacesAvailableAndEnabled = available && enabled;

      const usageStats = await getSpacesUsage(callCluster, server, spacesAvailableAndEnabled);

      return {
        available,
        enabled: spacesAvailableAndEnabled, // similar behavior as _xpack API in ES
        ...usageStats,
      } as UsageStats;
    },

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage.xpack.spaces namespace of the data payload
     */
    formatForBulkUpload: (result: UsageStats) => {
      return {
        type: KIBANA_STATS_TYPE_MONITORING,
        payload: {
          usage: {
            spaces: result,
          },
        },
      };
    },
  });
}
