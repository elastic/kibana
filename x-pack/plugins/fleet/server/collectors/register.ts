/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreSetup } from '@kbn/core/server';

import type { FleetConfigType } from '..';

import { getIsAgentsEnabled } from './config_collectors';
import { getAgentUsage, getAgentData } from './agent_collectors';
import type { AgentUsage } from './agent_collectors';
import { getInternalClients } from './helpers';
import { getPackageUsage } from './package_collectors';
import type { PackageUsage } from './package_collectors';
import { getFleetServerUsage, getFleetServerConfig } from './fleet_server_collector';
import type { FleetServerUsage } from './fleet_server_collector';
import { getAgentPoliciesUsage } from './agent_policies';
import { getAgentLogsTopErrors } from './agent_logs';

export interface Usage {
  agents_enabled: boolean;
  agents: AgentUsage;
  packages: PackageUsage[];
  fleet_server: FleetServerUsage;
}

export interface FleetUsage extends Usage {
  fleet_server_config: { policies: Array<{ input_config: any }> };
  agent_policies: { count: number; output_types: string[] };
  agents_per_version: Array<{
    version: string;
    count: number;
  }>;
  agent_checkin_status: {
    error: number;
    degraded: number;
  };
  agents_per_policy: number[];
  agent_logs_top_errors: string[];
  fleet_server_logs_top_errors: string[];
}

export const fetchFleetUsage = async (
  core: CoreSetup,
  config: FleetConfigType,
  abortController: AbortController
) => {
  const [soClient, esClient] = await getInternalClients(core);
  if (!soClient || !esClient) {
    return;
  }
  const usage = {
    agents_enabled: getIsAgentsEnabled(config),
    agents: await getAgentUsage(soClient, esClient),
    fleet_server: await getFleetServerUsage(soClient, esClient),
    packages: await getPackageUsage(soClient),
    ...(await getAgentData(esClient, abortController)),
    fleet_server_config: await getFleetServerConfig(soClient),
    agent_policies: await getAgentPoliciesUsage(esClient, abortController),
    ...(await getAgentLogsTopErrors(esClient)),
  };
  return usage;
};

// used by kibana daily collector
const fetchUsage = async (core: CoreSetup, config: FleetConfigType) => {
  const [soClient, esClient] = await getInternalClients(core);
  const usage = {
    agents_enabled: getIsAgentsEnabled(config),
    agents: await getAgentUsage(soClient, esClient),
    fleet_server: await getFleetServerUsage(soClient, esClient),
    packages: await getPackageUsage(soClient),
  };
  return usage;
};

export const fetchAgentsUsage = async (core: CoreSetup, config: FleetConfigType) => {
  const [soClient, esClient] = await getInternalClients(core);
  const usage = {
    agents_enabled: getIsAgentsEnabled(config),
    agents: await getAgentUsage(soClient, esClient),
    fleet_server: await getFleetServerUsage(soClient, esClient),
  };
  return usage;
};

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
    fetch: async () => fetchUsage(core, config),
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
        updating: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents in an updating state',
          },
        },
        offline: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents currently offline',
          },
        },
        inactive: {
          type: 'long',
          _meta: {
            description: 'The total number of of enrolled agents currently inactive',
          },
        },
        unenrolled: {
          type: 'long',
          _meta: {
            description: 'The total number of agents currently unenrolled',
          },
        },
        total_all_statuses: {
          type: 'long',
          _meta: {
            description: 'The total number of agents in any state, both enrolled and inactive',
          },
        },
      },
      fleet_server: {
        total_enrolled: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled Fleet Server agents, in any state',
          },
        },
        total_all_statuses: {
          type: 'long',
          _meta: {
            description:
              'The total number of Fleet Server agents in any state, both enrolled and inactive.',
          },
        },
        healthy: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled Fleet Server agents in a healthy state.',
          },
        },
        unhealthy: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled Fleet Server agents in an unhealthy state',
          },
        },
        updating: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled Fleet Server agents in an updating state',
          },
        },
        offline: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled Fleet Server agents currently offline',
          },
        },
        num_host_urls: {
          type: 'long',
          _meta: {
            description: 'The number of Fleet Server hosts configured in Fleet settings.',
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
