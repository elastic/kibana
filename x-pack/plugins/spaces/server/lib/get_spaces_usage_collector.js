/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KIBANA_SPACES_MONITORING_TYPE } from '../../common/constants';

/**
 *
 * @param callCluster
 * @param server
 * @param {boolean} spacesAvailable
 * @param withinDayRange
 * @return {ReportingUsageStats}
 */
async function getSpacesUsage(callCluster, server, spacesAvailable) {
  if (!spacesAvailable) return {};

  const { getSavedObjectsRepository } = server.savedObjects;

  const savedObjectsRepository = getSavedObjectsRepository(callCluster);

  const { saved_objects: spaces } = await savedObjectsRepository.find({ type: 'space' });

  return {
    count: spaces.length,
  };
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getSpacesUsageCollector(server) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_SPACES_MONITORING_TYPE,
    fetch: async callCluster => {
      const xpackInfo = server.plugins.xpack_main.info;
      const config = server.config();
      const available = xpackInfo && xpackInfo.isAvailable(); // some form of spaces is available for all valid licenses
      const enabled = config.get('xpack.spaces.enabled'); // follow ES behavior: if its not available then its not enabled
      const spacesAvailable = available && enabled;

      const usageStats = await getSpacesUsage(callCluster, server, spacesAvailable);

      return {
        available,
        enabled: available && enabled, // similar behavior as _xpack API in ES
        ...usageStats,
      };
    }
  });
}
