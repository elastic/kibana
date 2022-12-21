/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SearchRequest } from '@kbn/data-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
} from '../../../common/endpoint/constants';
import type { SecuritySolutionRequestHandlerContext } from '../../types';
import type {
  ActivityLog,
  EndpointAction,
  LogsEndpointAction,
} from '../../../common/endpoint/types';
import { doesLogsEndpointActionsIndexExist } from './yes_no_data_stream';
import { getDateFilters } from '../services/actions/utils';
import { ACTION_REQUEST_INDICES, ACTION_RESPONSE_INDICES } from '../services/actions/constants';

const queryOptions = {
  headers: {
    'X-elastic-product-origin': 'fleet',
  },
  ignore: [404],
};

export const getTimeSortedData = (data: ActivityLog['data']): ActivityLog['data'] => {
  return data.sort((a, b) =>
    new Date(b.item.data['@timestamp']) > new Date(a.item.data['@timestamp']) ? 1 : -1
  );
};

export const getActionRequestsResult = async ({
  context,
  logger,
  elasticAgentId,
  startDate,
  endDate,
  size,
  from,
}: {
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
  elasticAgentId: string;
  startDate: string;
  endDate: string;
  size: number;
  from: number;
}): Promise<{
  actionIds: string[];
  actionRequests: TransportResult<estypes.SearchResponse<unknown>, unknown>;
}> => {
  const dateFilters = getDateFilters({ startDate, endDate });
  const baseActionFilters = [
    { term: { agents: elasticAgentId } },
    { term: { input_type: 'endpoint' } },
    { term: { type: 'INPUT_ACTION' } },
  ];
  const actionsFilters = [...baseActionFilters, ...dateFilters];

  const hasLogsEndpointActionsIndex = await doesLogsEndpointActionsIndexExist({
    context,
    logger,
    indexName: ENDPOINT_ACTIONS_INDEX,
  });

  const actionsSearchQuery: SearchRequest = {
    index: hasLogsEndpointActionsIndex ? ACTION_REQUEST_INDICES : AGENT_ACTIONS_INDEX,
    size,
    from,
    body: {
      query: {
        bool: {
          filter: actionsFilters,
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    },
  };

  let actionRequests: TransportResult<estypes.SearchResponse<unknown>, unknown>;
  try {
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    actionRequests = await esClient.search(actionsSearchQuery, { ...queryOptions, meta: true });
    const actionIds = actionRequests?.body?.hits?.hits?.map((e) => {
      return e._index.includes(ENDPOINT_ACTIONS_DS)
        ? (e._source as LogsEndpointAction).EndpointActions.action_id
        : (e._source as EndpointAction).action_id;
    });

    return { actionIds, actionRequests };
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

export const getActionResponsesResult = async ({
  context,
  logger,
  elasticAgentId,
  actionIds,
  startDate,
  endDate,
}: {
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
  elasticAgentId: string;
  actionIds: string[];
  startDate: string;
  endDate: string;
}): Promise<TransportResult<estypes.SearchResponse<unknown>, unknown>> => {
  const dateFilters = getDateFilters({ startDate, endDate });
  const baseResponsesFilter = [
    { term: { agent_id: elasticAgentId } },
    { terms: { action_id: actionIds } },
  ];
  const responsesFilters = [...baseResponsesFilter, ...dateFilters];

  const hasLogsEndpointActionResponsesIndex = await doesLogsEndpointActionsIndexExist({
    context,
    logger,
    indexName: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  });

  const responsesSearchQuery: SearchRequest = {
    index: hasLogsEndpointActionResponsesIndex
      ? ACTION_RESPONSE_INDICES
      : AGENT_ACTIONS_RESULTS_INDEX,
    size: 1000,
    body: {
      query: {
        bool: {
          filter: responsesFilters,
        },
      },
    },
  };

  let actionResponses: TransportResult<estypes.SearchResponse<unknown>, unknown>;
  try {
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    actionResponses = await esClient.search(responsesSearchQuery, { ...queryOptions, meta: true });
  } catch (error) {
    logger.error(error);
    throw error;
  }
  return actionResponses;
};
