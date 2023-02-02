/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { appContextService } from '../app_context';
import type {
  Agent,
  AgentAction,
  NewAgentAction,
  FleetServerAgentAction,
} from '../../../common/types/models';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  SO_SEARCH_LIMIT,
} from '../../../common/constants';
import { AgentActionNotFoundError } from '../../errors';

import { bulkUpdateAgents } from './crud';

const ONE_MONTH_IN_MS = 2592000000;

export const NO_EXPIRATION = 'NONE';

export async function createAgentAction(
  esClient: ElasticsearchClient,
  newAgentAction: NewAgentAction
): Promise<AgentAction> {
  const actionId = newAgentAction.id ?? uuidv4();
  const timestamp = new Date().toISOString();
  const body: FleetServerAgentAction = {
    '@timestamp': timestamp,
    expiration:
      newAgentAction.expiration === NO_EXPIRATION
        ? undefined
        : newAgentAction.expiration ?? new Date(Date.now() + ONE_MONTH_IN_MS).toISOString(),
    agents: newAgentAction.agents,
    action_id: actionId,
    data: newAgentAction.data,
    type: newAgentAction.type,
    start_time: newAgentAction.start_time,
    minimum_execution_duration: newAgentAction.minimum_execution_duration,
    rollout_duration_seconds: newAgentAction.rollout_duration_seconds,
    total: newAgentAction.total,
  };

  await esClient.create({
    index: AGENT_ACTIONS_INDEX,
    id: uuidv4(),
    body,
    refresh: 'wait_for',
  });

  return {
    id: actionId,
    ...newAgentAction,
    created_at: timestamp,
  };
}

export async function bulkCreateAgentActions(
  esClient: ElasticsearchClient,
  newAgentActions: NewAgentAction[]
): Promise<AgentAction[]> {
  const actions = newAgentActions.map((newAgentAction) => {
    const id = newAgentAction.id ?? uuidv4();
    return {
      id,
      ...newAgentAction,
    } as AgentAction;
  });

  if (actions.length === 0) {
    return [];
  }

  await esClient.bulk({
    index: AGENT_ACTIONS_INDEX,
    body: actions.flatMap((action) => {
      const body: FleetServerAgentAction = {
        '@timestamp': new Date().toISOString(),
        expiration: action.expiration ?? new Date(Date.now() + ONE_MONTH_IN_MS).toISOString(),
        start_time: action.start_time,
        rollout_duration_seconds: action.rollout_duration_seconds,
        agents: action.agents,
        action_id: action.id,
        data: action.data,
        type: action.type,
      };

      return [
        {
          create: {
            _id: action.id,
          },
        },
        body,
      ];
    }),
  });

  return actions;
}

export async function createErrorActionResults(
  esClient: ElasticsearchClient,
  actionId: string,
  errors: Record<Agent['id'], Error>,
  errorMessage: string
) {
  const errorCount = Object.keys(errors).length;
  if (errorCount > 0) {
    appContextService
      .getLogger()
      .info(
        `Writing error action results of ${errorCount} agents. Possibly failed validation: ${errorMessage}.`
      );

    // writing out error result for those agents that have errors, so the action is not going to stay in progress forever
    await bulkCreateAgentActionResults(
      esClient,
      Object.keys(errors).map((agentId) => ({
        agentId,
        actionId,
        error: errors[agentId].message,
      }))
    );
  }
}

export async function bulkCreateAgentActionResults(
  esClient: ElasticsearchClient,
  results: Array<{
    actionId: string;
    agentId: string;
    error?: string;
  }>
): Promise<void> {
  if (results.length === 0) {
    return;
  }

  const bulkBody = results.flatMap((result) => {
    const body = {
      '@timestamp': new Date().toISOString(),
      action_id: result.actionId,
      agent_id: result.agentId,
      error: result.error,
    };

    return [
      {
        create: {
          _id: uuidv4(),
        },
      },
      body,
    ];
  });

  await esClient.bulk({
    index: AGENT_ACTIONS_RESULTS_INDEX,
    body: bulkBody,
    refresh: 'wait_for',
  });
}

export async function getAgentActions(esClient: ElasticsearchClient, actionId: string) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              action_id: actionId,
            },
          },
        ],
      },
    },
    size: SO_SEARCH_LIMIT,
  });

  if (res.hits.hits.length === 0) {
    throw new AgentActionNotFoundError('Action not found');
  }

  return res.hits.hits.map((hit) => ({
    ...hit._source,
    id: hit._id,
  }));
}

export async function getUnenrollAgentActions(
  esClient: ElasticsearchClient
): Promise<FleetServerAgentAction[]> {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              type: 'UNENROLL',
            },
          },
          {
            exists: {
              field: 'agents',
            },
          },
          {
            range: {
              expiration: { gte: new Date().toISOString() },
            },
          },
        ],
      },
    },
    size: SO_SEARCH_LIMIT,
  });

  return res.hits.hits.map((hit) => ({
    ...hit._source,
    id: hit._id,
  }));
}

export async function cancelAgentAction(esClient: ElasticsearchClient, actionId: string) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              action_id: actionId,
            },
          },
        ],
      },
    },
    size: SO_SEARCH_LIMIT,
  });

  if (res.hits.hits.length === 0) {
    throw new AgentActionNotFoundError('Action not found');
  }

  const cancelActionId = uuidv4();
  const now = new Date().toISOString();
  for (const hit of res.hits.hits) {
    if (!hit._source || !hit._source.agents || !hit._source.action_id) {
      continue;
    }
    if (hit._source.type === 'UPGRADE') {
      const errors = {};
      await bulkUpdateAgents(
        esClient,
        hit._source.agents.map((agentId) => ({
          agentId,
          data: {
            upgraded_at: null,
            upgrade_started_at: null,
          },
        })),
        errors
      );
      if (Object.keys(errors).length > 0) {
        appContextService
          .getLogger()
          .debug(`Errors while bulk updating agents for cancel action: ${JSON.stringify(errors)}`);
      }
    }
    await createAgentAction(esClient, {
      id: cancelActionId,
      type: 'CANCEL',
      agents: hit._source.agents,
      data: {
        target_id: hit._source.action_id,
      },
      created_at: now,
      expiration: hit._source.expiration,
    });
  }

  return {
    created_at: now,
    id: cancelActionId,
    type: 'CANCEL',
  } as AgentAction;
}

export interface ActionsService {
  getAgent: (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentId: string
  ) => Promise<Agent>;

  cancelAgentAction: (esClient: ElasticsearchClient, actionId: string) => Promise<AgentAction>;

  createAgentAction: (
    esClient: ElasticsearchClient,
    newAgentAction: Omit<AgentAction, 'id'>
  ) => Promise<AgentAction>;

  getAgentActions: (esClient: ElasticsearchClient, actionId: string) => Promise<any[]>;
}
