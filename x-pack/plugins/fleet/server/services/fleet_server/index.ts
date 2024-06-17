/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import semverGte from 'semver/functions/gte';
import semverCoerce from 'semver/functions/coerce';

import type { AgentPolicy } from '../../../common/types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, FLEET_SERVER_PACKAGE } from '../../../common/constants';

import { SO_SEARCH_LIMIT } from '../../constants';
import { getAgentsByKuery, getAgentStatusById } from '../agents';

import { packagePolicyService } from '../package_policy';
import { agentPolicyService } from '../agent_policy';
import { getAgentStatusForAgentPolicy } from '../agents';
import { appContextService } from '..';

/**
 * Retrieve all agent policies which has a Fleet Server package policy
 */
export const getFleetServerPolicies = async (
  soClient: SavedObjectsClientContract
): Promise<AgentPolicy[]> => {
  const fleetServerPackagePolicies = await packagePolicyService.list(soClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE}`,
  });

  // Extract associated fleet server agent policy IDs
  const fleetServerAgentPolicyIds = [
    ...new Set(fleetServerPackagePolicies.items.flatMap((p) => p.policy_ids)),
  ];

  // Retrieve associated agent policies
  const fleetServerAgentPolicies = fleetServerAgentPolicyIds.length
    ? await agentPolicyService.getByIDs(soClient, fleetServerAgentPolicyIds)
    : [];

  return fleetServerAgentPolicies;
};

/**
 * Check if there is at least one agent enrolled into the given agent policies.
 * Assumes that `agentPolicyIds` contains list of Fleet Server agent policies.
 * `activeOnly` flag can be used to filter only active agents.
 */
export const hasFleetServersForPolicies = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentPolicyIds: string[],
  activeOnly: boolean = false
): Promise<boolean> => {
  if (agentPolicyIds.length > 0) {
    const agentStatusesRes = await getAgentStatusForAgentPolicy(
      esClient,
      soClient,
      undefined,
      agentPolicyIds.map((id) => `policy_id:${id}`).join(' or ')
    );

    return activeOnly
      ? agentStatusesRes.online > 0 || agentStatusesRes.updating > 0
      : agentStatusesRes.all > 0;
  }
  return false;
};

/**
 * Check if at least one fleet server agent exists, regardless of its online status
 */
export async function hasFleetServers(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
) {
  return await hasFleetServersForPolicies(
    esClient,
    soClient,
    (await getFleetServerPolicies(soClient)).map((policy) => policy.id)
  );
}

/**
 * This function checks if all Fleet Server agents are running at least a given version, but with
 * some important caveats related to enabling the secrets storage feature:
 *
 * 1. Any unenrolled agents are ignored if they are running an outdated version
 * 2. Managed agents in an inactive state are ignored if they are running an outdated version.
 */
export async function checkFleetServerVersionsForSecretsStorage(
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
      item.policy_ids.forEach((id) => policyIds.add(id));
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
      if (
        agentStatus === 'unenrolled' ||
        fleetServerAgent.status === 'unenrolling' ||
        fleetServerAgent.unenrolled_at
      ) {
        logger.debug(
          `Found unenrolled Fleet Server agent ${fleetServerAgent.id} on version ${agentVersion} when checking for secrets storage compatibility - ignoring`
        );
        continue;
      }

      const isManagedAgentPolicy = managedAgentPolicies.some(
        (managedPolicy) => managedPolicy.id === fleetServerAgent.policy_id
      );

      // If this is an agent enrolled in a managed policy, and it is no longer active then we ignore it if it's
      // running on an outdated version. This prevents users with offline Elastic Agent on Cloud policies from
      // being stuck when it comes to enabling secrets, as agents can't be unenrolled from managed policies via Fleet UI.
      if (
        (isManagedAgentPolicy && ['offline', 'inactive'].includes(agentStatus)) ||
        !fleetServerAgent.active
      ) {
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
