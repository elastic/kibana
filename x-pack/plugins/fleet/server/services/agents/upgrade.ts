/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import moment from 'moment';
import pMap from 'p-map';

import type { Agent, BulkActionResult, FleetServerAgentAction, CurrentUpgrade } from '../../types';
import {
  AgentReassignmentError,
  HostedAgentPolicyRestrictionRelatedError,
  IngestManagerError,
} from '../../errors';
import { isAgentUpgradeable } from '../../../common/services';
import { appContextService } from '../app_context';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import {
  getAgentDocuments,
  getAgents,
  updateAgent,
  bulkUpdateAgents,
  getAgentPolicyForAgent,
} from './crud';
import { searchHitToAgent } from './helpers';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';

const MINIMUM_EXECUTION_DURATION_SECONDS = 1800; // 30m

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
    agents: [agentId],
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
    version: string;
    sourceUri?: string | undefined;
    force?: boolean;
    upgradeDurationSeconds?: number;
    startTime?: string;
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

  const hostedPolicies = await getHostedPolicies(soClient, givenAgents);

  // results from getAgents with options.kuery '' (or even 'active:false') may include hosted agents
  // filter them out unless options.force
  const agentsToCheckUpgradeable =
    'kuery' in options && !options.force
      ? givenAgents.filter((agent: Agent) => !isHostedAgent(hostedPolicies, agent))
      : givenAgents;

  const kibanaVersion = appContextService.getKibanaVersion();
  const upgradeableResults = await Promise.allSettled(
    agentsToCheckUpgradeable.map(async (agent) => {
      // Filter out agents currently unenrolling, unenrolled, or not upgradeable b/c of version check
      const isNotAllowed =
        !options.force && !isAgentUpgradeable(agent, kibanaVersion, options.version);
      if (isNotAllowed) {
        throw new IngestManagerError(`${agent.id} is not upgradeable`);
      }

      if (!options.force && isHostedAgent(hostedPolicies, agent)) {
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

  const rollingUpgradeOptions = options?.upgradeDurationSeconds
    ? {
        start_time: options.startTime ?? now,
        minimum_execution_duration: MINIMUM_EXECUTION_DURATION_SECONDS,
        expiration: moment(options.startTime ?? now)
          .add(options?.upgradeDurationSeconds, 'seconds')
          .toISOString(),
      }
    : {};

  await createAgentAction(esClient, {
    created_at: now,
    data,
    ack_data: data,
    type: 'UPGRADE',
    agents: agentsToUpdate.map((agent) => agent.id),
    ...rollingUpgradeOptions,
  });

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

/**
 * Return current bulk upgrades (non completed or cancelled)
 */
export async function getCurrentBulkUpgrades(
  esClient: ElasticsearchClient,
  now = new Date().toISOString()
): Promise<CurrentUpgrade[]> {
  // Fetch all non expired actions
  const [_upgradeActions, cancelledActionIds] = await Promise.all([
    _getUpgradeActions(esClient, now),
    _getCancelledActionId(esClient, now),
  ]);

  let upgradeActions = _upgradeActions.filter(
    (action) => cancelledActionIds.indexOf(action.actionId) < 0
  );

  // Fetch acknowledged result for every upgrade action
  upgradeActions = await pMap(
    upgradeActions,
    async (upgradeAction) => {
      const { count } = await esClient.count({
        index: AGENT_ACTIONS_RESULTS_INDEX,
        ignore_unavailable: true,
        query: {
          bool: {
            must: [
              {
                term: {
                  action_id: upgradeAction.actionId,
                },
              },
            ],
          },
        },
      });

      return {
        ...upgradeAction,
        nbAgentsAck: count,
        complete: upgradeAction.nbAgents <= count,
      };
    },
    { concurrency: 20 }
  );

  upgradeActions = upgradeActions.filter((action) => !action.complete);

  return upgradeActions;
}

async function _getCancelledActionId(
  esClient: ElasticsearchClient,
  now = new Date().toISOString()
) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        must: [
          {
            term: {
              type: 'CANCEL',
            },
          },
          {
            exists: {
              field: 'agents',
            },
          },
          {
            range: {
              expiration: { gte: now },
            },
          },
        ],
      },
    },
  });

  return res.hits.hits.map((hit) => hit._source?.data?.target_id as string);
}

async function _getUpgradeActions(esClient: ElasticsearchClient, now = new Date().toISOString()) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        must: [
          {
            term: {
              type: 'UPGRADE',
            },
          },
          {
            exists: {
              field: 'agents',
            },
          },
          {
            range: {
              expiration: { gte: now },
            },
          },
        ],
      },
    },
  });

  return Object.values(
    res.hits.hits.reduce((acc, hit) => {
      if (!hit._source || !hit._source.action_id) {
        return acc;
      }

      if (!acc[hit._source.action_id]) {
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgents: 0,
          complete: false,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime: hit._source?.start_time,
        };
      }

      acc[hit._source.action_id].nbAgents += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: CurrentUpgrade })
  );
}
