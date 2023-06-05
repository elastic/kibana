/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { estypes } from '@elastic/elasticsearch';

import { ES_SEARCH_LIMIT } from '../../../common/constants';

import { FleetActionsError } from '../../../common/errors';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';
import { auditLoggingService } from '../audit_logging';

import type { FleetActionRequest, FleetActionResult } from './types';

export const createAction = async (
  esClient: ElasticsearchClient,
  action: FleetActionRequest
): Promise<FleetActionRequest> => {
  try {
    const body = {
      ...action,
      action_id: action.action_id ?? uuidV4(),
      '@timestamp': action['@timestamp'] ?? new Date().toISOString(),
    };
    await esClient.create(
      {
        index: AGENT_ACTIONS_INDEX,
        // doc id is same as action_id
        id: body.action_id,
        body,
        refresh: 'wait_for',
      },
      {
        meta: true,
      }
    );

    auditLoggingService.writeCustomAuditLog({
      message: `User ${action.user_id} created Fleet action [id=${action.action_id}] with input_type [${action.input_type}]`,
    });

    return body;
  } catch (createActionError) {
    throw new FleetActionsError(
      `Error creating action: ${createActionError.message}`,
      createActionError
    );
  }
};

type BulkCreate = Array<{ create: { _index: string; _id: string } } | FleetActionRequest>;
export const bulkCreateActions = async (
  esClient: ElasticsearchClient,
  _actions: FleetActionRequest[]
): Promise<{
  status: 'success' | 'failed' | 'mixed';
  items: Array<{
    status: 'success' | 'error';
    // action_id
    id: string;
  }>;
}> => {
  const actions: FleetActionRequest[] = [];
  const bulkCreateActionsBody = _actions.reduce<BulkCreate>((acc, action) => {
    // doc id is same as action_id
    const actionId = action.action_id ?? uuidV4();
    acc.push({ create: { _index: AGENT_ACTIONS_INDEX, _id: actionId } });
    const actionDoc = {
      ...action,
      action_id: actionId,
      '@timestamp': action['@timestamp'] ?? new Date().toISOString(),
    };
    acc.push(actionDoc);
    actions.push(actionDoc);

    return acc;
  }, []);

  try {
    const bulkCreateActionsResponse = (await esClient.bulk({
      body: bulkCreateActionsBody,
      refresh: 'wait_for',
    })) as unknown as estypes.BulkResponse;

    const responseItems = bulkCreateActionsResponse.items;

    responseItems.forEach((item) => {
      if (!item.create?.error) {
        auditLoggingService.writeCustomAuditLog({
          message: `User created Fleet action [id=${item.create?._id}]`,
        });
      }
    });

    const status = responseItems.every((item) => item.create?.error)
      ? 'failed'
      : responseItems.some((item) => item.create?.error)
      ? 'mixed'
      : 'success';

    return {
      status,
      items: responseItems.map((item) => ({
        status: item.create?.error ? 'error' : 'success',
        id: item.create?._id ?? '',
      })),
    };
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
): Promise<{
  items: FleetActionRequest[];
  total: number;
}> => {
  try {
    const getActionsResponse = await esClient.search({
      index: AGENT_ACTIONS_INDEX,
      from: 0,
      size: ES_SEARCH_LIMIT,
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

    const actions = getActionsResponse.hits.hits.reduce<FleetActionRequest[]>((acc, hit) => {
      if (hit._source) {
        acc.push(hit._source as FleetActionRequest);
      }
      return acc;
    }, []);

    return {
      items: actions,
      total: actions.length,
    };
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
): Promise<{ items: FleetActionRequest[]; total: number }> => {
  try {
    const query = toElasticsearchQuery(fromKueryExpression(kuery));
    const getActionSearchResponse = await esClient.search({
      index: AGENT_ACTIONS_INDEX,
      from: 0,
      size: ES_SEARCH_LIMIT,
      query,
    });

    const actions = getActionSearchResponse.hits.hits.reduce<FleetActionRequest[]>((acc, hit) => {
      if (hit._source) {
        acc.push(hit._source as FleetActionRequest);
      }
      return acc;
    }, []);

    return {
      items: actions,
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
): Promise<{ items: FleetActionResult[]; total: number }> => {
  try {
    const getActionsResultsResponse = await esClient.search({
      index: AGENT_ACTIONS_RESULTS_INDEX,
      from: 0,
      size: ES_SEARCH_LIMIT,
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
    const actionsResults = getActionsResultsResponse.hits.hits.reduce<FleetActionResult[]>(
      (acc, hit) => {
        if (hit._source) {
          acc.push(hit._source as FleetActionResult);
        }
        return acc;
      },
      []
    );

    return {
      items: actionsResults,
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
): Promise<{ items: FleetActionResult[]; total: number }> => {
  try {
    const query = toElasticsearchQuery(fromKueryExpression(kuery));
    const getActionSearchResponse = await esClient.search({
      index: AGENT_ACTIONS_INDEX,
      from: 0,
      size: ES_SEARCH_LIMIT,
      query,
    });

    const actionsResults = getActionSearchResponse.hits.hits.reduce<FleetActionResult[]>(
      (acc, hit) => {
        if (hit._source) {
          acc.push(hit._source as FleetActionResult);
        }
        return acc;
      },
      []
    );

    return {
      items: actionsResults,
      total: actionsResults.length,
    };
  } catch (getActionResultsSearchError) {
    throw new FleetActionsError(
      `Error getting action results with kuery: ${getActionResultsSearchError.message}`,
      getActionResultsSearchError
    );
  }
};
