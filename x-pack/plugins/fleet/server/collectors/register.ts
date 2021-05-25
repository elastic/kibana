/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import type { CoreSetup } from 'kibana/server';

import type { FleetConfigType } from '..';

import { getIsAgentsEnabled } from './config_collectors';
import { getAgentUsage } from './agent_collectors';
import type { AgentUsage } from './agent_collectors';
import { getInternalClients } from './helpers';
import { getPackageUsage } from './package_collectors';
import type { PackageUsage } from './package_collectors';

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
      const [soClient, esClient] = await getInternalClients(core);
      return {
        agents_enabled: getIsAgentsEnabled(config),
        agents: await getAgentUsage(config, soClient, esClient),
        packages: await getPackageUsage(soClient),
      };
    },
    schema: {
      agents_enabled: { type: 'boolean' },
      agents: {
        total_enrolled: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
        healthy: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents in a healthy state',
          },
        },
        unhealthy: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents in an unhealthy state',
          },
        },
        offline: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents currently offline',
          },
        },
        total_all_statuses: {
          type: 'long',
          _meta: {
            description: 'The total number of agents in any state, both enrolled and inactive',
          },
        },
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
