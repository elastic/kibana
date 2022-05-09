/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent, AgentAction, FleetServerAgentAction } from '../../../common/types/models';
import { AGENT_ACTIONS_INDEX } from '../../../common/constants';

const ONE_MONTH_IN_MS = 2592000000;

export async function createAgentAction(
  esClient: ElasticsearchClient,
  newAgentAction: Omit<AgentAction, 'id'>
): Promise<AgentAction> {
  const id = uuid.v4();
  const body: FleetServerAgentAction = {
    '@timestamp': new Date().toISOString(),
    expiration: new Date(Date.now() + ONE_MONTH_IN_MS).toISOString(),
    agents: [newAgentAction.agent_id],
    action_id: id,
    data: newAgentAction.data,
    type: newAgentAction.type,
  };

  await esClient.create({
    index: AGENT_ACTIONS_INDEX,
    id,
    body,
    refresh: 'wait_for',
  });

  return {
    id,
    ...newAgentAction,
  };
}

export async function bulkCreateAgentActions(
  esClient: ElasticsearchClient,
  newAgentActions: Array<Omit<AgentAction, 'id'>>
): Promise<AgentAction[]> {
  const actions = newAgentActions.map((newAgentAction) => {
    const id = uuid.v4();
    return {
      id,
      ...newAgentAction,
    };
  });

  if (actions.length === 0) {
    return actions;
  }

  await esClient.bulk({
    index: AGENT_ACTIONS_INDEX,
    body: actions.flatMap((action) => {
      const body: FleetServerAgentAction = {
        '@timestamp': new Date().toISOString(),
        expiration: new Date(Date.now() + ONE_MONTH_IN_MS).toISOString(),
        agents: [action.agent_id],
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

export interface ActionsService {
  getAgent: (esClient: ElasticsearchClient, agentId: string) => Promise<Agent>;

  createAgentAction: (
    esClient: ElasticsearchClient,
    newAgentAction: Omit<AgentAction, 'id'>
  ) => Promise<AgentAction>;
}
