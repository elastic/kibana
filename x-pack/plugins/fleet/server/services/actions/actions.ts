/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { v4 as uuidV4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { estypes } from '@elastic/elasticsearch';

import { FleetActionsError } from '../../../common/errors';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';
import { auditLoggingService } from '../audit_logging';

import { appContextService } from '../app_context';

import type { FleetAction, FleetActionResponse } from './types';

export const createAction = async (
  esClient: ElasticsearchClient,
  action: Partial<FleetAction>
): Promise<Partial<FleetAction>> => {
  try {
    const body = {
      ...action,
      action_id: action.action_id ?? uuidV4(),
      '@timestamp': action['@timestamp'] ?? new Date().toISOString(),
    };
    await esClient.create(
      {
        index: AGENT_ACTIONS_INDEX,
        id: body.action_id,
        body,
        refresh: 'wait_for',
      },
      {
        meta: true,
      }
    );

    auditLoggingService.writeCustomAuditLog({
      message: `User created Fleet action [id=${action.action_id}]`,
    });

    return body;
  } catch (createActionError) {
    throw new FleetActionsError(
      `Error creating action: ${createActionError.message}`,
      createActionError
    );
  }
};

type BulkCreate = Array<{ create: { _index: string; _id: string } } | object>;

export const bulkCreateActions = async (
  esClient: ElasticsearchClient,
  _actions: Array<Partial<FleetAction>>
): Promise<
  Array<{
    id: string;
    action: Partial<FleetAction>;
  }>
> => {
  const actions: Array<Partial<FleetAction>> = [];
  const bulkCreateActionsBody = _actions.reduce<BulkCreate>((acc, action) => {
    acc.push({ create: { _index: AGENT_ACTIONS_INDEX, _id: action.action_id ?? uuidV4() } });
    const actionDoc = {
      ...action,
      action_id: action.action_id ?? uuidV4(),
      '@timestamp': action['@timestamp'] ?? new Date().toISOString(),
    };
    acc.push(actionDoc);
    actions.push(actionDoc);

    return acc;
  }, []);

  try {
    const bulkCreateActionsResponse = (await esClient.bulk(
      {
        body: bulkCreateActionsBody,
        refresh: 'wait_for',
      },
      {
        meta: true,
      }
    )) as unknown as estypes.BulkResponse;

    const [errorItems, successItems] = partition(
      bulkCreateActionsResponse.items,
      (a) => a.create?.error
    );

    successItems.forEach((successItem) => {
      auditLoggingService.writeCustomAuditLog({
        message: `User created Fleet action [id=${successItem.create?._id}]`,
      });
    });

    // log errored items
    if (errorItems.length) {
      appContextService.getLogger().error(new FleetActionsError(JSON.stringify(errorItems)));
    }

    // return success items
    return successItems.map((item, i) => ({
      id: item.create!._id as string,
      action: actions[i],
    }));
  } catch (createBulkActionsError) {
    throw new FleetActionsError(
      `Error creating bulk actions: ${createBulkActionsError.message}`,
      createBulkActionsError
    );
  }
};

export const getActionsByIds = async (
  esClient: ElasticsearchClient,
  actionIds: string[]
): Promise<FleetAction[]> => {
  try {
    const getActionsResponse = await esClient.search({
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
    });
    return getActionsResponse.hits?.hits?.map((hit) => hit._source ?? {}) as FleetAction[];
  } catch (getActionsByIdError) {
    throw new FleetActionsError(
      `Error getting action: ${getActionsByIdError.message}`,
      getActionsByIdError
    );
  }
};

export const getActionsWithKuery = async (
  esClient: ElasticsearchClient,
  kuery: string
): Promise<{ actions: FleetAction[]; total: number }> => {
  try {
    const query = toElasticsearchQuery(fromKueryExpression(kuery));
    const getActionSearchResponse = await esClient.search({
      index: AGENT_ACTIONS_INDEX,
      query,
    });

    const actions = getActionSearchResponse.hits.hits.reduce<FleetAction[]>((acc, hit) => {
      if (hit._source) {
        acc.push(hit._source as FleetAction);
      }
      return acc;
    }, []);

    return {
      actions,
      total: actions.length,
    };
  } catch (getActionSearchError) {
    throw new FleetActionsError(
      `Error getting actions with kuery: ${getActionSearchError.message}`,
      getActionSearchError
    );
  }
};

export const getActionResultsByIds = async (
  esClient: ElasticsearchClient,
  actionIds: string[]
): Promise<{ actionsResults: FleetActionResponse[]; total: number }> => {
  try {
    const getActionsResultsResponse = await esClient.search({
      index: AGENT_ACTIONS_RESULTS_INDEX,
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
    });
    const actionsResults = getActionsResultsResponse.hits.hits.reduce<FleetActionResponse[]>(
      (acc, hit) => {
        if (hit._source) {
          acc.push(hit._source as FleetActionResponse);
        }
        return acc;
      },
      []
    );

    return {
      actionsResults,
      total: actionsResults.length,
    };
  } catch (getActionByIdError) {
    throw new FleetActionsError(
      `Error getting action results: ${getActionByIdError.message}`,
      getActionByIdError
    );
  }
};

export const getActionResultsWithKuery = async (
  esClient: ElasticsearchClient,
  kuery: string
): Promise<{ actionsResults: FleetActionResponse[]; total: number }> => {
  try {
    const query = toElasticsearchQuery(fromKueryExpression(kuery));
    const getActionSearchResponse = await esClient.search({
      index: AGENT_ACTIONS_INDEX,
      query,
    });

    const actionsResults = getActionSearchResponse.hits.hits.reduce<FleetActionResponse[]>(
      (acc, hit) => {
        if (hit._source) {
          acc.push(hit._source as FleetActionResponse);
        }
        return acc;
      },
      []
    );

    return {
      actionsResults,
      total: actionsResults.length,
    };
  } catch (getActionResultsSearchError) {
    throw new FleetActionsError(
      `Error getting action results with kuery: ${getActionResultsSearchError.message}`,
      getActionResultsSearchError
    );
  }
};
