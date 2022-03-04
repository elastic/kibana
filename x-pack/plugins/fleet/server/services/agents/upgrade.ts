/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import type { Agent, BulkActionResult } from '../../types';
import { agentPolicyService } from '../../services';
import {
  AgentReassignmentError,
  HostedAgentPolicyRestrictionRelatedError,
  IngestManagerError,
} from '../../errors';
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

function isMgetDoc(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.GetGetResult {
  return Boolean(doc && 'found' in doc);
}

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
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot upgrade agent ${agentId} in hosted agent policy ${agentPolicy.id}`
    );
  }

  await createAgentAction(esClient, {
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
      if (!isMgetDoc(agentResult) || agentResult.found === false) {
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

  // get any policy ids from upgradable agents
  const policyIdsToGet = new Set(
    givenAgents.filter((agent) => agent.policy_id).map((agent) => agent.policy_id!)
  );

  // get the agent policies for those ids
  const agentPolicies = await agentPolicyService.getByIDs(soClient, Array.from(policyIdsToGet), {
    fields: ['is_managed'],
  });
  const hostedPolicies = agentPolicies.reduce<Record<string, boolean>>((acc, policy) => {
    acc[policy.id] = policy.is_managed;
    return acc;
  }, {});
  const isHostedAgent = (agent: Agent) => agent.policy_id && hostedPolicies[agent.policy_id];

  // results from getAgents with options.kuery '' (or even 'active:false') may include hosted agents
  // filter them out unless options.force
  const agentsToCheckUpgradeable =
    'kuery' in options && !options.force
      ? givenAgents.filter((agent: Agent) => !isHostedAgent(agent))
      : givenAgents;

  const kibanaVersion = appContextService.getKibanaVersion();
  const upgradeableResults = await Promise.allSettled(
    agentsToCheckUpgradeable.map(async (agent) => {
      // Filter out agents currently unenrolling, unenrolled, or not upgradeable b/c of version check
      const isAllowed = options.force || isAgentUpgradeable(agent, kibanaVersion);
      if (!isAllowed) {
        throw new IngestManagerError(`${agent.id} is not upgradeable`);
      }

      if (!options.force && isHostedAgent(agent)) {
        throw new HostedAgentPolicyRestrictionRelatedError(
          `Cannot upgrade agent in hosted agent policy ${agent.policy_id}`
        );
      }
      return agent;
    })
  );

  // Filter & record errors from results
  const agentsToUpdate = upgradeableResults.reduce<Agent[]>((agents, result, index) => {
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

  const givenOrder =
    'agentIds' in options ? options.agentIds : agentsToCheckUpgradeable.map((agent) => agent.id);

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
