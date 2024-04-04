/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import semverGte from 'semver/functions/gte';
import semverCoerce from 'semver/functions/coerce';

import { FLEET_SERVER_SERVERS_INDEX, SO_SEARCH_LIMIT } from '../../constants';
import { getAgentsByKuery, getAgentStatusById } from '../agents';

import { packagePolicyService } from '../package_policy';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '..';

/**
 * Check if at least one fleet server is connected
 */
export async function hasFleetServers(esClient: ElasticsearchClient) {
  const res = await esClient.search<{}, {}>({
    index: FLEET_SERVER_SERVERS_INDEX,
    ignore_unavailable: true,
    filter_path: 'hits.total',
    track_total_hits: true,
    rest_total_hits_as_int: true,
  });

  return (res.hits.total as number) > 0;
}

export async function allFleetServerVersionsAreAtLeast(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  version: string
): Promise<boolean> {
  const logger = appContextService.getLogger();

  let hasMore = true;
  const policyIds = new Set<string>();
  let page = 1;
  while (hasMore) {
    const res = await packagePolicyService.list(soClient, {
      page: page++,
      perPage: 20,
      kuery: 'ingest-package-policies.package.name:fleet_server',
    });

    for (const item of res.items) {
      policyIds.add(item.policy_id);
    }

    if (res.items.length === 0) {
      hasMore = false;
    }
  }

  const managedAgentPolicies = await agentPolicyService.getAllManagedAgentPolicies(soClient);
  const fleetServerAgents = await getAgentsByKuery(esClient, soClient, {
    showInactive: true,
    perPage: SO_SEARCH_LIMIT,
  });

  if (fleetServerAgents.agents.length === 0) {
    return false;
  }

  let result = true;

  for (const fleetServerAgent of fleetServerAgents.agents) {
    const agentVersion = fleetServerAgent.local_metadata?.elastic?.agent?.version;

    if (!agentVersion) {
      continue;
    }

    const isNewerVersion = semverGte(semverCoerce(agentVersion)!, version);

    if (!isNewerVersion) {
      const agentStatus = await getAgentStatusById(esClient, soClient, fleetServerAgent.id);

      // Any unenrolled Fleet Server agents can be ignored
      if (agentStatus === 'unenrolled') {
        logger.debug(
          `Found outdated Fleet Server agent ${fleetServerAgent.id} on version ${agentVersion} when checking for secrets storage compatibility - ignoring due to ${agentStatus} status`
        );
        continue;
      }

      const isManagedAgentPolicy = managedAgentPolicies.some(
        (managedPolicy) => managedPolicy.id === fleetServerAgent.policy_id
      );

      // If this is an agent enrolled in a managed policy, and it is no longer active then we ignore it if it's
      // running on an outdated version. This prevents users with offline Elastic Agent on Cloud policies from
      // being stuck when it comes to enabling secrets, as agents can't be unenrolled from managed policies via Fleet UI.
      if (isManagedAgentPolicy && agentStatus === 'offline') {
        logger.debug(
          `Found outdated managed Fleet Server agent ${fleetServerAgent.id} on version ${agentVersion} when checking for secrets storage compatibility - ignoring due to ${agentStatus} status`
        );
        continue;
      }

      logger.debug(
        `Found outdated Fleet Server agent ${fleetServerAgent.id} on version ${agentVersion} - secrets won't be enabled until all Fleet Server agents are running at least ${version}`
      );

      result = false;
      break;
    }
  }

  return result;
}
