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
import { PackageUsage, getPackageUsage } from './package_collectors';
import { IngestManagerConfigType } from '..';

interface Usage {
  fleet_enabled: boolean;
  agents: AgentUsage;
  packages: PackageUsage[];
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
      const soClient = await getInternalSavedObjectsClient(core);
      return {
        fleet_enabled: getIsFleetEnabled(config),
        agents: await getAgentUsage(soClient),
        packages: await getPackageUsage(soClient),
      };
    },
    schema: {
      fleet_enabled: { type: 'boolean' },
      agents: {
        total: { type: 'long' },
        online: { type: 'long' },
        error: { type: 'long' },
        offline: { type: 'long' },
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
