/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KIBANA_USAGE_TYPE } from '../../../common/constants';

/**
 * Fetches saved object counts by querying the .kibana index
 */
export function getKibanaUsageCollector(server) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_USAGE_TYPE,
    async fetch({ savedObjectsClient }) {
      return savedObjectsClient.summarize();
    },
    formatForBulkUpload: result => {
      return [{
        type: 'kibana_stats',
        payload: {
          usage: result
        }
      }];
    }
  });
}
