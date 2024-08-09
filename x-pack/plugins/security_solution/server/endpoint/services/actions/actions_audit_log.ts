/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { TransportResult } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type {
  ActivityLog,
  ActivityLogEntry,
  EndpointAction,
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { doesLogsEndpointActionsIndexExist } from '../../utils';

import {
  categorizeActionResults,
  categorizeResponseResults,
  getDateFilters,
  getUniqueLogData,
} from './utils';
import { ACTION_REQUEST_INDICES, ACTION_RESPONSE_INDICES } from './constants';

const queryOptions = {
  headers: {
    'X-elastic-product-origin': 'fleet',
  },
  ignore: [404],
};

/**
 * Used only for the deprecated `/api/endpoint/action_log/{agent_id}` legacy API route
 *
 * Use newer response action services instead
 *
 * @deprecated
 */
export const getAuditLogResponse = async ({
  elasticAgentId,
  page,
  pageSize,
  startDate,
  endDate,
  context,
  logger,
}: {
  elasticAgentId: string;
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
}): Promise<ActivityLog> => {
  const size = Math.floor(pageSize / 2);
  const from = page <= 1 ? 0 : page * size - size + 1;

  const data = await getActivityLog({
    context,
    from,
    size,
    startDate,
    endDate,
    elasticAgentId,
    logger,
  });

  return {
    page,
    pageSize,
    startDate,
    endDate,
    data,
  };
};

const getActivityLog = async ({
  context,
  size,
  from,
  startDate,
  endDate,
  elasticAgentId,
  logger,
}: {
  context: SecuritySolutionRequestHandlerContext;
  elasticAgentId: string;
  size: number;
  from: number;
  startDate: string;
  endDate: string;
  logger: Logger;
}): Promise<ActivityLogEntry[]> => {
  let actionsResult: TransportResult<estypes.SearchResponse<unknown>, unknown>;
  let responsesResult: TransportResult<estypes.SearchResponse<unknown>, unknown>;

  try {
    // fetch actions with matching agent_id
    const { actionIds, actionRequests } = await getActionRequestsResult({
      context,
      logger,
      elasticAgentId,
      startDate,
      endDate,
      size,
      from,
    });
    actionsResult = actionRequests;

    // fetch responses with matching unique set of `action_id`s
    responsesResult = await getActionResponsesResult({
      actionIds: [...new Set(actionIds)], // de-dupe `action_id`s
      context,
      logger,
      elasticAgentId,
      startDate,
      endDate,
    });
  } catch (error) {
    logger.error(error);
    throw error;
  }
  if (actionsResult?.statusCode !== 200) {
    logger.error(`Error fetching actions log for agent_id ${elasticAgentId}`);
    throw new Error(`Error fetching actions log for agent_id ${elasticAgentId}`);
  }

  // label record as `action`, `fleetAction`
  const responses = categorizeResponseResults({
    results: responsesResult?.body?.hits?.hits as Array<
      estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>
    >,
  });

  // label record as `response`, `fleetResponse`
  const actions = categorizeActionResults({
    results: actionsResult?.body?.hits?.hits as Array<
      estypes.SearchHit<EndpointAction | LogsEndpointAction>
    >,
  });

  // filter out the duplicate endpoint actions that also have fleetActions
  // include endpoint actions that have no fleet actions
  const uniqueLogData = getUniqueLogData([...responses, ...actions]);

  // sort by @timestamp in desc order, newest first
  const sortedData = getTimeSortedData(uniqueLogData);

  return sortedData;
};

const getTimeSortedData = (data: ActivityLog['data']): ActivityLog['data'] => {
  return data.sort((a, b) =>
    new Date(b.item.data['@timestamp']) > new Date(a.item.data['@timestamp']) ? 1 : -1
  );
};

const getActionRequestsResult = async ({
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
  const esClient = (await context.core).elasticsearch.client.asInternalUser;

  const hasLogsEndpointActionsIndex = await doesLogsEndpointActionsIndexExist({
    esClient,
    logger,
    indexName: ENDPOINT_ACTIONS_INDEX,
  });

  const actionsSearchQuery: estypes.SearchRequest = {
    index: hasLogsEndpointActionsIndex ? ACTION_REQUEST_INDICES : AGENT_ACTIONS_INDEX,
    size,
    from,
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
  };

  let actionRequests: TransportResult<estypes.SearchResponse<unknown>, unknown>;
  try {
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

const getActionResponsesResult = async ({
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
  const esClient = (await context.core).elasticsearch.client.asInternalUser;

  const hasLogsEndpointActionResponsesIndex = await doesLogsEndpointActionsIndexExist({
    esClient,
    logger,
    indexName: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  });

  const responsesSearchQuery: estypes.SearchRequest = {
    index: hasLogsEndpointActionResponsesIndex
      ? ACTION_RESPONSE_INDICES
      : AGENT_ACTIONS_RESULTS_INDEX,
    size: 1000,
    query: {
      bool: {
        filter: responsesFilters,
      },
    },
  };

  let actionResponses: TransportResult<estypes.SearchResponse<unknown>, unknown>;
  try {
    actionResponses = await esClient.search(responsesSearchQuery, { ...queryOptions, meta: true });
  } catch (error) {
    logger.error(error);
    throw error;
  }
  return actionResponses;
};
