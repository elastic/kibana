/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CoreSetup } from 'kibana/server';
import { getIsFleetEnabled } from './config_collectors';
import { AgentUsage, getAgentUsage } from './agent_collectors';
import { getInternalSavedObjectsClient } from './helpers';
import { IngestManagerConfigType } from '..';

interface Usage {
  fleet_enabled: boolean;
  agents: AgentUsage;
  packages: Array<{
    name: string;
    version: string;
    enabled: boolean;
  }>;
}

export function registerIngestManagerUsageCollector(
  core: CoreSetup,
  config: IngestManagerConfigType,
  usageCollection: UsageCollectionSetup | undefined
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  // if for any reason the saved objects client is not available, also return
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
      const soClient = await getInternalSavedObjectsClient(core);
      return {
        fleet_enabled: getIsFleetEnabled(config),
        agents: await getAgentUsage(soClient),
        packages: [
          {
            name: 'system',
            version: '0.0.1',
            enabled: true,
          },
        ],
      };
    },
    // schema: { // temporarily disabled because of type errors
    //   fleet_enabled: { type: 'boolean' },
    //   agents: {
    //    events: { type: 'number' },
    //    total: { type: 'number' },
    //    online: { type: 'number' },
    //    error: { type: 'number' },
    //    offline: { type: 'number' },
    //   },
    //   packages: {
    //     name: { type: 'keyword' },
    //     version: { type: 'keyword' },
    //     enabled: { type: 'boolean' },
    //   },
    // },
  });

  // register usage collector
  usageCollection.registerCollector(ingestManagerCollector);
}
