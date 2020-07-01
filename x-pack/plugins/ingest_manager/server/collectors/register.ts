/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

interface Usage {
  fleet_enabled: boolean;
}

export function registerIngestManagerUsageCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const ingestManagerCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'ingest_manager',
    isReady: () => true,
    fetch: async () => {
      // query ES and get some data
      // summarize the data into a model
      // return the modeled object that includes whatever you want to track
      return {
        fleet_enabled: true,
      };
    },
    schema: {
      fleet_enabled: { type: 'boolean' },
    },
  });

  // register usage collector
  usageCollection.registerCollector(ingestManagerCollector);
}
