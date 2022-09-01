/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';
import uuid from 'uuid';

import type { Agent, FleetServerAgentAction, CurrentUpgrade } from '../../types';
import { AgentReassignmentError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';
import { SO_SEARCH_LIMIT } from '../../constants';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { getAgentsByKuery } from './crud';
import { getAgentDocuments, updateAgent, getAgentPolicyForAgent } from './crud';
import { searchHitToAgent } from './helpers';
import { upgradeBatch } from './upgrade_action_runner';

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
    batchSize?: number;
  }
) {
  // Full set of agents
  const outgoingErrors: Record<Agent['id'], Error> = {};
  let givenAgents: Agent[] = [];
  let total;
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
    const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;
    const res = await getAgentsByKuery(esClient, {
      kuery: options.kuery,
      showInactive: options.showInactive ?? false,
      page: 1,
      perPage: batchSize,
    });
    givenAgents = res.agents;
    total = res.total;
  }

  return await upgradeBatch(soClient, esClient, givenAgents, outgoingErrors, {
    ...options,
    total,
    actionId: uuid(),
  });
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
    size: SO_SEARCH_LIMIT,
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
    size: SO_SEARCH_LIMIT,
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
