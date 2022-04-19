/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SearchRequest } from '@kbn/data-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TransportResult } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  failedFleetActionErrorCode,
} from '../../../common/endpoint/constants';
import { SecuritySolutionRequestHandlerContext } from '../../types';
import {
  ActivityLog,
  ActivityLogAction,
  EndpointActivityLogAction,
  ActivityLogActionResponse,
  EndpointActivityLogActionResponse,
  ActivityLogItemTypes,
  EndpointAction,
  LogsEndpointAction,
  EndpointActionResponse,
  LogsEndpointActionResponse,
  ActivityLogEntry,
} from '../../../common/endpoint/types';
import { doesLogsEndpointActionsIndexExist } from '.';

const actionsIndices = [AGENT_ACTIONS_INDEX, ENDPOINT_ACTIONS_INDEX];
// search all responses indices irrelevant of namespace
const responseIndices = [AGENT_ACTIONS_RESULTS_INDEX, ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN];
export const logsEndpointActionsRegex = new RegExp(`(^\.ds-\.logs-endpoint\.actions-default-).+`);
// matches index names like .ds-.logs-endpoint.action.responses-name_space---suffix-2022.01.25-000001
export const logsEndpointResponsesRegex = new RegExp(
  `(^\.ds-\.logs-endpoint\.action\.responses-\\w+-).+`
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

export const getUniqueLogData = (activityLogEntries: ActivityLogEntry[]): ActivityLogEntry[] => {
  // find the error responses for actions that didn't make it to fleet index
  const onlyResponsesForFleetErrors = activityLogEntries
    .filter(
      (e) =>
        e.type === ActivityLogItemTypes.RESPONSE &&
        e.item.data.error?.code === failedFleetActionErrorCode
    )
    .map(
      (e: ActivityLogEntry) => (e.item.data as LogsEndpointActionResponse).EndpointActions.action_id
    );

  // all actions and responses minus endpoint actions.
  const nonEndpointActionsDocs = activityLogEntries.filter(
    (e) => e.type !== ActivityLogItemTypes.ACTION
  );

  // only endpoint actions that match the error responses
  const onlyEndpointActionsDocWithoutFleetActions = activityLogEntries
    .filter((e) => e.type === ActivityLogItemTypes.ACTION)
    .filter((e: ActivityLogEntry) =>
      onlyResponsesForFleetErrors.includes(
        (e.item.data as LogsEndpointAction).EndpointActions.action_id
      )
    );

  // join the error actions and the rest
  return [...nonEndpointActionsDocs, ...onlyEndpointActionsDocWithoutFleetActions];
};

export const categorizeResponseResults = ({
  results,
}: {
  results: Array<estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>>;
}): Array<ActivityLogActionResponse | EndpointActivityLogActionResponse> => {
  return results?.length
    ? results?.map((e) => {
        const isResponseDoc: boolean = matchesIndexPattern({
          regexPattern: logsEndpointResponsesRegex,
          index: e._index,
        });
        return isResponseDoc
          ? {
              type: ActivityLogItemTypes.RESPONSE,
              item: { id: e._id, data: e._source as LogsEndpointActionResponse },
            }
          : {
              type: ActivityLogItemTypes.FLEET_RESPONSE,
              item: { id: e._id, data: e._source as EndpointActionResponse },
            };
      })
    : [];
};

export const categorizeActionResults = ({
  results,
}: {
  results: Array<estypes.SearchHit<EndpointAction | LogsEndpointAction>>;
}): Array<ActivityLogAction | EndpointActivityLogAction> => {
  return results?.length
    ? results?.map((e) => {
        const isActionDoc: boolean = matchesIndexPattern({
          regexPattern: logsEndpointActionsRegex,
          index: e._index,
        });
        return isActionDoc
          ? {
              type: ActivityLogItemTypes.ACTION,
              item: { id: e._id, data: e._source as LogsEndpointAction },
            }
          : {
              type: ActivityLogItemTypes.FLEET_ACTION,
              item: { id: e._id, data: e._source as EndpointAction },
            };
      })
    : [];
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

  let actionRequests: TransportResult<estypes.SearchResponse<unknown>, unknown>;
  try {
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    actionRequests = await esClient.search(actionsSearchQuery, { ...queryOptions, meta: true });
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

const matchesIndexPattern = ({
  regexPattern,
  index,
}: {
  regexPattern: RegExp;
  index: string;
}): boolean => regexPattern.test(index);
