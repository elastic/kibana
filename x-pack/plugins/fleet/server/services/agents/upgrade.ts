/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import type { Agent, AgentAction, AgentActionSOAttributes, BulkActionResult } from '../../types';
import { AGENT_ACTION_SAVED_OBJECT_TYPE } from '../../constants';
import { agentPolicyService } from '../../services';
import { AgentReassignmentError, IngestManagerError } from '../../errors';
import { isAgentUpgradeable } from '../../../common/services';
import { appContextService } from '../app_context';

import { bulkCreateAgentActions, createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import {
  getAgentDocuments,
  getAgents,
  updateAgent,
  bulkUpdateAgents,
  getAgentPolicyForAgent,
} from './crud';
import { searchHitToAgent } from './helpers';

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
  options: ({ agents: Agent[] } | GetAgentsOptions) & {
    sourceUri: string | undefined;
    version: string;
    force?: boolean;
  }
) {
  // Full set of agents
  const outgoingErrors: Record<Agent['id'], Error> = {};
  let givenAgents: Agent[] = [];
  if ('agents' in options) {
    givenAgents = options.agents;
  } else if ('agentIds' in options) {
    const givenAgentsResults = await getAgentDocuments(esClient, options.agentIds);
    for (const agentResult of givenAgentsResults) {
      if (agentResult.found === false) {
        outgoingErrors[agentResult._id] = new AgentReassignmentError(
          `Cannot find agent ${agentResult._id}`
        );
      } else {
        givenAgents.push(searchHitToAgent(agentResult));
      }
    }
  } else if ('kuery' in options) {
    givenAgents = await getAgents(esClient, options);
  }
  const givenOrder =
    'agentIds' in options ? options.agentIds : givenAgents.map((agent) => agent.id);

  // get any policy ids from upgradable agents
  const policyIdsToGet = new Set(
    givenAgents.filter((agent) => agent.policy_id).map((agent) => agent.policy_id!)
  );

  // get the agent policies for those ids
  const agentPolicies = await agentPolicyService.getByIDs(soClient, Array.from(policyIdsToGet), {
    fields: ['is_managed'],
  });
  const managedPolicies = agentPolicies.reduce<Record<string, boolean>>((acc, policy) => {
    acc[policy.id] = policy.is_managed;
    return acc;
  }, {});

  // Filter out agents currently unenrolling, unenrolled, or not upgradeable b/c of version check
  const kibanaVersion = appContextService.getKibanaVersion();
  const agentResults = await Promise.allSettled(
    givenAgents.map(async (agent) => {
      const isAllowed = options.force || isAgentUpgradeable(agent, kibanaVersion);
      if (!isAllowed) {
        throw new IngestManagerError(`${agent.id} is not upgradeable`);
      }

      if (!options.force && agent.policy_id && managedPolicies[agent.policy_id]) {
        throw new IngestManagerError(`Cannot upgrade agent in managed policy ${agent.policy_id}`);
      }
      return agent;
    })
  );

  // Filter to agents that do not already use the new agent policy ID
  const agentsToUpdate = agentResults.reduce<Agent[]>((agents, result, index) => {
    if (result.status === 'fulfilled') {
      agents.push(result.value);
    } else {
      const id = givenAgents[index].id;
      outgoingErrors[id] = result.reason;
    }
    return agents;
  }, []);

  // Create upgrade action for each agent
  const now = new Date().toISOString();
  const data = {
    version: options.version,
    source_uri: options.sourceUri,
  };

  await bulkCreateAgentActions(
    soClient,
    esClient,
    agentsToUpdate.map((agent) => ({
      agent_id: agent.id,
      created_at: now,
      data,
      ack_data: data,
      type: 'UPGRADE',
    }))
  );

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        upgraded_at: null,
        upgrade_started_at: now,
      },
    }))
  );
  const orderedOut = givenOrder.map((agentId) => {
    const hasError = agentId in outgoingErrors;
    const result: BulkActionResult = {
      id: agentId,
      success: !hasError,
    };
    if (hasError) {
      result.error = outgoingErrors[agentId];
    }
    return result;
  });

  return { items: orderedOut };
}
