/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CoreSetup } from 'kibana/server';
import { getIsAgentsEnabled } from './config_collectors';
import { AgentUsage, getAgentUsage } from './agent_collectors';
import { getInternalSavedObjectsClient } from './helpers';
import { PackageUsage, getPackageUsage } from './package_collectors';
import { FleetConfigType } from '..';

interface Usage {
  agents_enabled: boolean;
  agents: AgentUsage;
  packages: PackageUsage[];
}

export function registerFleetUsageCollector(
  core: CoreSetup,
  config: FleetConfigType,
  usageCollection: UsageCollectionSetup | undefined
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  // if for any reason the saved objects client is not available, also return
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const fleetCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'fleet',
    isReady: () => true,
    fetch: async () => {
      const soClient = await getInternalSavedObjectsClient(core);
      return {
        agents_enabled: getIsAgentsEnabled(config),
        agents: await getAgentUsage(soClient),
        packages: await getPackageUsage(soClient),
      };
    },
    schema: {
      agents_enabled: { type: 'boolean' },
      agents: {
        total: { type: 'long' },
        online: { type: 'long' },
        error: { type: 'long' },
        offline: { type: 'long' },
      },
      packages: {
        type: 'array',
        items: {
          name: { type: 'keyword' },
          version: { type: 'keyword' },
          enabled: { type: 'boolean' },
        },
      },
    },
  });

  // register usage collector
  usageCollection.registerCollector(fleetCollector);
}
