/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import apm from 'elastic-apm-node';

import { appContextService } from '../app_context';
import type {
  Agent,
  AgentAction,
  AgentActionType,
  NewAgentAction,
  FleetServerAgentAction,
} from '../../../common/types/models';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  SO_SEARCH_LIMIT,
} from '../../../common/constants';
import { AgentActionNotFoundError } from '../../errors';

import { auditLoggingService } from '../audit_logging';

import { bulkUpdateAgents } from './crud';

const ONE_MONTH_IN_MS = 2592000000;

export const NO_EXPIRATION = 'NONE';

const SIGNED_ACTIONS: Set<Partial<AgentActionType>> = new Set(['UNENROLL', 'UPGRADE']);

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
    traceparent: apm.currentTraceparent,
  };

  const messageSigningService = appContextService.getMessageSigningService();
  if (SIGNED_ACTIONS.has(newAgentAction.type) && messageSigningService) {
    const signedBody = await messageSigningService.sign(body);
    body.signed = {
      data: signedBody.data.toString('base64'),
      signature: signedBody.signature,
    };
  }

  await esClient.create({
    index: AGENT_ACTIONS_INDEX,
    id: uuidv4(),
    body,
    refresh: 'wait_for',
  });

  auditLoggingService.writeCustomAuditLog({
    message: `User created Fleet action [id=${actionId}]`,
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

  const messageSigningService = appContextService.getMessageSigningService();
  await esClient.bulk({
    index: AGENT_ACTIONS_INDEX,
    body: await Promise.all(
      actions.flatMap(async (action) => {
        const body: FleetServerAgentAction = {
          '@timestamp': new Date().toISOString(),
          expiration: action.expiration ?? new Date(Date.now() + ONE_MONTH_IN_MS).toISOString(),
          start_time: action.start_time,
          rollout_duration_seconds: action.rollout_duration_seconds,
          agents: action.agents,
          action_id: action.id,
          data: action.data,
          type: action.type,
          traceparent: apm.currentTraceparent,
        };

        if (SIGNED_ACTIONS.has(action.type) && messageSigningService) {
          const signedBody = await messageSigningService.sign(body);
          body.signed = {
            data: signedBody.data.toString('base64'),
            signature: signedBody.signature,
          };
        }

        return [
          {
            create: {
              _id: action.id,
            },
          },
          body,
        ];
      })
    ),
  });

  for (const action of actions) {
    auditLoggingService.writeCustomAuditLog({
      message: `User created Fleet action [id=${action.id}]`,
    });
  }

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

  for (const result of results) {
    auditLoggingService.writeCustomAuditLog({
      message: `User created Fleet action result [id=${result.actionId}]`,
    });
  }

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

  const result: FleetServerAgentAction[] = [];

  for (const hit of res.hits.hits) {
    auditLoggingService.writeCustomAuditLog({
      message: `User retrieved Fleet action [id=${hit._source?.action_id}]`,
    });

    result.push({
      ...hit._source,
      id: hit._id,
    });
  }

  return result;
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

  const result: FleetServerAgentAction[] = [];

  for (const hit of res.hits.hits) {
    auditLoggingService.writeCustomAuditLog({
      message: `User retrieved Fleet action [id=${hit._source?.action_id}]`,
    });

    result.push({
      ...hit._source,
      id: hit._id,
    });
  }

  return result;
}

export async function cancelAgentAction(esClient: ElasticsearchClient, actionId: string) {
  const getUpgradeActions = async () => {
    const res = await esClient.search<FleetServerAgentAction>({
      index: AGENT_ACTIONS_INDEX,
      query: {
        bool: {
          filter: [
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

    for (const hit of res.hits.hits) {
      auditLoggingService.writeCustomAuditLog({
        message: `User retrieved Fleet action [id=${hit._source?.action_id}]}]`,
      });
    }

    const upgradeActions: FleetServerAgentAction[] = res.hits.hits
      .map((hit) => hit._source as FleetServerAgentAction)
      .filter(
        (action: FleetServerAgentAction | undefined): boolean =>
          !!action && !!action.agents && !!action.action_id && action.type === 'UPGRADE'
      );
    return upgradeActions;
  };

  const cancelActionId = uuidv4();
  const now = new Date().toISOString();

  const cancelledActions: Array<{ agents: string[] }> = [];

  const createAction = async (action: FleetServerAgentAction) => {
    await createAgentAction(esClient, {
      id: cancelActionId,
      type: 'CANCEL',
      agents: action.agents!,
      data: {
        target_id: action.action_id,
      },
      created_at: now,
      expiration: action.expiration,
    });
    cancelledActions.push({
      agents: action.agents!,
    });
  };

  let upgradeActions = await getUpgradeActions();
  for (const action of upgradeActions) {
    await createAction(action);
  }

  const updateAgentsToHealthy = async (action: FleetServerAgentAction) => {
    appContextService
      .getLogger()
      .info(
        `Moving back ${
          action.agents!.length
        } agents from updating to healthy state after cancel upgrade`
      );
    const errors = {};
    await bulkUpdateAgents(
      esClient,
      action.agents!.map((agentId: string) => ({
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
        .info(`Errors while bulk updating agents for cancel action: ${JSON.stringify(errors)}`);
    }
  };

  for (const action of upgradeActions) {
    await updateAgentsToHealthy(action);
  }

  // At the end of cancel, doing one more query on upgrade action to find those docs that were possibly created by a concurrent upgrade action.
  // This is to make sure we cancel all upgrade batches.
  upgradeActions = await getUpgradeActions();
  if (cancelledActions.length < upgradeActions.length) {
    const missingBatches = upgradeActions.filter(
      (upgradeAction) =>
        !cancelledActions.some(
          (cancelled) => upgradeAction.agents && cancelled.agents[0] === upgradeAction.agents[0]
        )
    );
    appContextService.getLogger().debug(`missing batches to cancel: ${missingBatches.length}`);
    if (missingBatches.length > 0) {
      for (const missingBatch of missingBatches) {
        await createAction(missingBatch);
        await updateAgentsToHealthy(missingBatch);
      }
    }
  }

  return {
    created_at: now,
    id: cancelActionId,
    type: 'CANCEL',
  } as AgentAction;
}

async function getAgentActionsByIds(esClient: ElasticsearchClient, actionIds: string[]) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    query: {
      bool: {
        filter: [
          {
            terms: {
              action_id: actionIds,
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

  const result: FleetServerAgentAction[] = [];

  for (const hit of res.hits.hits) {
    auditLoggingService.writeCustomAuditLog({
      message: `User retrieved Fleet action [id=${hit._source?.action_id}]`,
    });

    result.push({
      ...hit._source,
      id: hit._id,
    });
  }

  return result;
}

export const getAgentsByActionsIds = async (
  esClient: ElasticsearchClient,
  actionsIds: string[]
) => {
  const actions = await getAgentActionsByIds(esClient, actionsIds);
  return actions.flatMap((a) => a?.agents).filter((agent) => !!agent) as string[];
};

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
