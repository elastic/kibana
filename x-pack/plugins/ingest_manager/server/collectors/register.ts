/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

interface Usage {
  fleet_enabled: boolean;
  agents: {
    enrolled: number;
  };
  packages: {
    name: string;
    version: string;
    enabled: boolean;
  };
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
        agents: {
          enrolled: 42,
        },
        packages: [
          {
            name: 'system',
            version: '0.0.1',
            enabled: true,
          },
        ],
      };
    },
    schema: {
      fleet_enabled: { type: 'boolean' },
      agents: {
        enrolled: { type: 'number' },
      },
      packages: {
        name: { type: 'keyword' },
        version: { type: 'keyword' },
        enabled: { type: 'boolean' },
      },
    },
  });

  // register usage collector
  usageCollection.registerCollector(ingestManagerCollector);
}
