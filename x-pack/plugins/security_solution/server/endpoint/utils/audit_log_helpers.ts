/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { SearchRequest } from 'src/plugins/data/public';
import { SearchHit, SearchResponse } from '@elastic/elasticsearch/api/types';
import { ApiResponse } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../fleet/common';
import {
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX,
} from '../../../common/endpoint/constants';
import { SecuritySolutionRequestHandlerContext } from '../../types';
import {
  ActivityLog,
  ActivityLogItemTypes,
  EndpointAction,
  LogsEndpointAction,
} from '../../../common/endpoint/types';
import { doesLogsEndpointActionsIndexExist } from '../utils';

const actionsIndices = [AGENT_ACTIONS_INDEX, ENDPOINT_ACTIONS_INDEX];
const responseIndices = [AGENT_ACTIONS_RESULTS_INDEX, ENDPOINT_ACTION_RESPONSES_INDEX];
export const logsEndpointActionsRegex = new RegExp(`(^\.ds-\.logs-endpoint\.actions-default-).+`);
export const logsEndpointResponsesRegex = new RegExp(
  `(^\.ds-\.logs-endpoint\.action\.responses-default-).+`
);
const queryOptions = {
  headers: {
    'X-elastic-product-origin': 'fleet',
  },
  ignore: [404],
};

const getDateFilters = ({ startDate, endDate }: { startDate: string; endDate: string }) => {
  return [
    { range: { '@timestamp': { gte: startDate } } },
    { range: { '@timestamp': { lte: endDate } } },
  ];
};

export const categorizeResponseResults = ({ results }: { results: Array<SearchHit<unknown>> }) => {
  return results?.length
    ? results?.map((e) => {
        return {
          type: hasNewEndpointIndex({ regexPattern: logsEndpointResponsesRegex, index: e._index })
            ? ActivityLogItemTypes.RESPONSE
            : ActivityLogItemTypes.FLEET_RESPONSE,
          item: { id: e._id, data: e._source },
        };
      })
    : [];
};

export const categorizeActionResults = ({ results }: { results: Array<SearchHit<unknown>> }) => {
  return results?.length
    ? results?.map((e) => {
        return {
          type: hasNewEndpointIndex({ regexPattern: logsEndpointActionsRegex, index: e._index })
            ? ActivityLogItemTypes.ACTION
            : ActivityLogItemTypes.FLEET_ACTION,
          item: { id: e._id, data: e._source },
        };
      })
    : [];
};

export const getTimeSortedData = (data: ActivityLog['data']) => {
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
  actionRequests: ApiResponse<SearchResponse<unknown>, unknown>;
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
    index: hasLogsEndpointActionsIndex ? actionsIndices : AGENT_ACTIONS_INDEX,
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

  let actionRequests: ApiResponse<SearchResponse<unknown>, unknown>;
  try {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    actionRequests = await esClient.search(actionsSearchQuery, queryOptions);
    const actionIds = actionRequests?.body?.hits?.hits?.map((e) => {
      return logsEndpointActionsRegex.test(e._index)
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
}): Promise<ApiResponse<SearchResponse<unknown>, unknown>> => {
  const dateFilters = getDateFilters({ startDate, endDate });
  const baseResponsesFilter = [
    { term: { agent_id: elasticAgentId } },
    { terms: { action_id: actionIds } },
  ];
  const responsesFilters = [...baseResponsesFilter, ...dateFilters];

  const hasLogsEndpointActionResponsesIndex = await doesLogsEndpointActionsIndexExist({
    context,
    logger,
    indexName: ENDPOINT_ACTION_RESPONSES_INDEX,
  });

  const responsesSearchQuery: SearchRequest = {
    index: hasLogsEndpointActionResponsesIndex ? responseIndices : AGENT_ACTIONS_RESULTS_INDEX,
    size: 1000,
    body: {
      query: {
        bool: {
          filter: responsesFilters,
        },
      },
    },
  };

  let actionResponses: ApiResponse<SearchResponse<unknown>, unknown>;
  try {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    actionResponses = await esClient.search(responsesSearchQuery, queryOptions);
  } catch (error) {
    logger.error(error);
    throw error;
  }
  return actionResponses;
};

const hasNewEndpointIndex = ({ regexPattern, index }: { regexPattern: RegExp; index: string }) =>
  regexPattern.test(index);
