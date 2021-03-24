/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import type { AgentAction, AgentActionSOAttributes } from '../../types';
import { AGENT_ACTION_SAVED_OBJECT_TYPE } from '../../constants';
import { agentPolicyService } from '../../services';
import { IngestManagerError } from '../../errors';
import { isAgentUpgradeable } from '../../../common/services';
import { appContextService } from '../app_context';

import { bulkCreateAgentActions, createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { getAgents, updateAgent, bulkUpdateAgents, getAgentPolicyForAgent } from './crud';

export async function sendUpgradeAgentAction({
  soClient,
  esClient,
  agentId,
  version,
  sourceUri,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  agentId: string;
  version: string;
  sourceUri: string | undefined;
}) {
  const now = new Date().toISOString();
  const data = {
    version,
    source_uri: sourceUri,
  };

  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId);
  if (agentPolicy?.is_managed) {
    throw new IngestManagerError(
      `Cannot upgrade agent ${agentId} in managed policy ${agentPolicy.id}`
    );
  }

  await createAgentAction(soClient, esClient, {
    agent_id: agentId,
    created_at: now,
    data,
    ack_data: data,
    type: 'UPGRADE',
  });
  await updateAgent(esClient, agentId, {
    upgraded_at: null,
    upgrade_started_at: now,
  });
}

export async function ackAgentUpgraded(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentAction: AgentAction
) {
  const {
    attributes: { ack_data: ackData },
  } = await soClient.get<AgentActionSOAttributes>(AGENT_ACTION_SAVED_OBJECT_TYPE, agentAction.id);
  if (!ackData) throw new Error('data missing from UPGRADE action');
  const { version } = JSON.parse(ackData);
  if (!version) throw new Error('version missing from UPGRADE action');
  await updateAgent(esClient, agentAction.agent_id, {
    upgraded_at: new Date().toISOString(),
    upgrade_started_at: null,
  });
}

export async function sendUpgradeAgentsActions(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: GetAgentsOptions & {
    sourceUri: string | undefined;
    version: string;
    force?: boolean;
  }
) {
  // Full set of agents
  const agentsGiven = await getAgents(esClient, options);

  // Filter out agents currently unenrolling, unenrolled, or not upgradeable b/c of version check
  const kibanaVersion = appContextService.getKibanaVersion();
  const upgradeableAgents = options.force
    ? agentsGiven
    : agentsGiven.filter((agent) => isAgentUpgradeable(agent, kibanaVersion));

  if (!options.force) {
    // get any policy ids from upgradable agents
    const policyIdsToGet = new Set(
      upgradeableAgents.filter((agent) => agent.policy_id).map((agent) => agent.policy_id!)
    );

    // get the agent policies for those ids
    const agentPolicies = await agentPolicyService.getByIDs(soClient, Array.from(policyIdsToGet), {
      fields: ['is_managed'],
    });

    // throw if any of those agent policies are managed
    for (const policy of agentPolicies) {
      if (policy.is_managed) {
        throw new IngestManagerError(`Cannot upgrade agent in managed policy ${policy.id}`);
      }
    }
  }
  // Create upgrade action for each agent
  const now = new Date().toISOString();
  const data = {
    version: options.version,
    source_uri: options.sourceUri,
  };

  await bulkCreateAgentActions(
    soClient,
    esClient,
    upgradeableAgents.map((agent) => ({
      agent_id: agent.id,
      created_at: now,
      data,
      ack_data: data,
      type: 'UPGRADE',
    }))
  );

  return await bulkUpdateAgents(
    esClient,
    upgradeableAgents.map((agent) => ({
      agentId: agent.id,
      data: {
        upgraded_at: null,
        upgrade_started_at: now,
      },
    }))
  );
}
