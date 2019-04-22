/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsService } from 'src/legacy/server/kbn_server';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
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
async function getSpacesUsage(
  callCluster: any,
  savedObjects: SavedObjectsService,
  spacesAvailable: boolean
) {
  if (!spacesAvailable) {
    return {};
  }

  const { getSavedObjectsRepository } = savedObjects;

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

interface CollectorDeps {
  config: any;
  usage: { collectorSet: any };
  savedObjects: SavedObjectsService;
  xpackMain: XPackMainPlugin;
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getSpacesUsageCollector(deps: CollectorDeps) {
  const { collectorSet } = deps.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_SPACES_STATS_TYPE,
    fetch: async (callCluster: any) => {
      const xpackInfo = deps.xpackMain.info;
      const available = xpackInfo && xpackInfo.isAvailable(); // some form of spaces is available for all valid licenses
      const enabled = deps.config.get('xpack.spaces.enabled');
      const spacesAvailableAndEnabled = available && enabled;

      const usageStats = await getSpacesUsage(
        callCluster,
        deps.savedObjects,
        spacesAvailableAndEnabled
      );

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
