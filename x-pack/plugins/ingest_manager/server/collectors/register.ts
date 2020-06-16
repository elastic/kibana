/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { APICaller } from 'kibana/server';
import { USAGE_TYPE } from '../../common';

export function registerIngestManagerUsageCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const ingestManagerCollector = usageCollection.makeUsageCollector({
    type: USAGE_TYPE,
    isReady: () => true,
    fetch: async (callCluster: APICaller) => {
      // query ES and get some data
      // summarize the data into a model
      // return the modeled object that includes whatever you want to track

      return {
        packages_installed: [
          {
            name: 'system',
            version: '0.0.1',
          },
          {
            name: 'endpoint',
            version: '1.0.0',
          },
        ],
        agents_enrolled: 42,
        agent_configs_present: 23,
        fleet_enabled: true,
      };
    },
  });

  // register usage collector
  usageCollection.registerCollector(ingestManagerCollector);
}
