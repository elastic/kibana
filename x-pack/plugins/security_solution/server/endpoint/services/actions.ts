/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TransportResult } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../fleet/common';
import { ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN } from '../../../common/endpoint/constants';
import { SecuritySolutionRequestHandlerContext } from '../../types';
import {
  ActivityLog,
  ActivityLogEntry,
  EndpointAction,
  LogsEndpointAction,
  EndpointActionResponse,
  EndpointPendingActions,
  LogsEndpointActionResponse,
} from '../../../common/endpoint/types';
import {
  catchAndWrapError,
  categorizeActionResults,
  categorizeResponseResults,
  getActionRequestsResult,
  getActionResponsesResult,
  getTimeSortedData,
  getUniqueLogData,
} from '../utils';
import { EndpointMetadataService } from './metadata';

const PENDING_ACTION_RESPONSE_MAX_LAPSED_TIME = 300000; // 300k ms === 5 minutes

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

const hasAckInResponse = (response: EndpointActionResponse): boolean => {
  return response.action_response?.endpoint?.ack ?? false;
};

// return TRUE if for given action_id/agent_id
// there is no doc in .logs-endpoint.action.response-default
const hasNoEndpointResponse = ({
  action,
  agentId,
  indexedActionIds,
}: {
  action: EndpointAction;
  agentId: string;
  indexedActionIds: string[];
}): boolean => {
  return action.agents.includes(agentId) && !indexedActionIds.includes(action.action_id);
};

// return TRUE if for given action_id/agent_id
// there is no doc in .fleet-actions-results
const hasNoFleetResponse = ({
  action,
  agentId,
  agentResponses,
}: {
  action: EndpointAction;
  agentId: string;
  agentResponses: EndpointActionResponse[];
}): boolean => {
  return (
    action.agents.includes(agentId) &&
    !agentResponses.map((e) => e.action_id).includes(action.action_id)
  );
};

export const getPendingActionCounts = async (
  esClient: ElasticsearchClient,
  metadataService: EndpointMetadataService,
  /** The Fleet Agent IDs to be checked */
  agentIDs: string[],
  isPendingActionResponsesWithAckEnabled: boolean
): Promise<EndpointPendingActions[]> => {
  // retrieve the unexpired actions for the given hosts
  const recentActions = await esClient
    .search<EndpointAction>(
      {
        index: AGENT_ACTIONS_INDEX,
        size: 10000,
        from: 0,
        body: {
          query: {
            bool: {
              filter: [
                { term: { type: 'INPUT_ACTION' } }, // actions that are directed at agent children
                { term: { input_type: 'endpoint' } }, // filter for agent->endpoint actions
                { range: { expiration: { gte: 'now' } } }, // that have not expired yet
                { terms: { agents: agentIDs } }, // for the requested agent IDs
              ],
            },
          },
        },
      },
      { ignore: [404] }
    )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .then((result) => result?.hits?.hits?.map((a) => a._source!) || [])
    .catch(catchAndWrapError);

  // retrieve any responses to those action IDs from these agents
  const responses = await fetchActionResponses(
    esClient,
    metadataService,
    recentActions.map((a) => a.action_id),
    agentIDs
  );

  const pending: EndpointPendingActions[] = [];
  for (const agentId of agentIDs) {
    const agentResponses = responses[agentId];

    // get response actionIds for responses with ACKs
    const ackResponseActionIdList: string[] = agentResponses
      .filter(hasAckInResponse)
      .map((response) => response.action_id);

    // actions Ids that are indexed in new response index
    const indexedActionIds = await hasEndpointResponseDoc({
      agentId,
      actionIds: ackResponseActionIdList,
      esClient,
    });

    const pendingActions: EndpointAction[] = recentActions.filter((action) => {
      return ackResponseActionIdList.includes(action.action_id) // if has ack
        ? hasNoEndpointResponse({ action, agentId, indexedActionIds }) // then find responses in new index
        : hasNoFleetResponse({
            // else use the legacy way
            action,
            agentId,
            agentResponses,
          });
    });

    pending.push({
      agent_id: agentId,
      pending_actions: pendingActions
        .map((a) => a.data.command)
        .reduce((acc, cur) => {
          if (!isPendingActionResponsesWithAckEnabled) {
            acc[cur] = 0; // set pending counts to 0 when FF is disabled
          } else {
            // else do the usual counting
            if (cur in acc) {
              acc[cur] += 1;
            } else {
              acc[cur] = 1;
            }
          }

          return acc;
        }, {} as EndpointPendingActions['pending_actions']),
    });
  }

  return pending;
};

/**
 * Returns a string of action ids for search result
 *
 * @param esClient
 * @param actionIds
 * @param agentId
 */
const hasEndpointResponseDoc = async ({
  actionIds,
  agentId,
  esClient,
}: {
  actionIds: string[];
  agentId: string;
  esClient: ElasticsearchClient;
}): Promise<string[]> => {
  const response = await esClient
    .search<LogsEndpointActionResponse>(
      {
        index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
        size: 10000,
        body: {
          query: {
            bool: {
              filter: [{ terms: { action_id: actionIds } }, { term: { agent_id: agentId } }],
            },
          },
        },
      },
      { ignore: [404] }
    )
    .then((result) => result?.hits?.hits?.map((a) => a._source?.EndpointActions.action_id) || [])
    .catch(catchAndWrapError);
  return response.filter((action): action is string => action !== undefined);
};

/**
 * Returns back a map of elastic Agent IDs to array of action responses that have a response.
 *
 * @param esClient
 * @param metadataService
 * @param actionIds
 * @param agentIds
 */
const fetchActionResponses = async (
  esClient: ElasticsearchClient,
  metadataService: EndpointMetadataService,
  actionIds: string[],
  agentIds: string[]
): Promise<Record<string, EndpointActionResponse[]>> => {
  const actionResponsesByAgentId: Record<string, EndpointActionResponse[]> = agentIds.reduce(
    (acc, agentId) => {
      acc[agentId] = [];
      return acc;
    },
    {} as Record<string, EndpointActionResponse[]>
  );

  const actionResponses = await esClient
    .search<EndpointActionResponse>(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        size: 10000,
        from: 0,
        body: {
          query: {
            bool: {
              filter: [
                { terms: { action_id: actionIds } }, // get results for these actions
                { terms: { agent_id: agentIds } }, // ONLY responses for the agents we are interested in (ignore others)
              ],
            },
          },
        },
      },
      { ignore: [404] }
    )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .then((result) => result?.hits?.hits?.map((a) => a._source!) || [])
    .catch(catchAndWrapError);

  if (actionResponses.length === 0) {
    return actionResponsesByAgentId;
  }

  // Get the latest docs from the metadata data-stream for the Elastic Agent IDs in the action responses
  // This will be used determine if we should withhold the action id from the returned list in cases where
  // the Endpoint might not yet have sent an updated metadata document (which would be representative of
  // the state of the endpoint post-action)
  const latestEndpointMetadataDocs = await metadataService.findHostMetadataForFleetAgents(
    esClient,
    agentIds
  );

  // Object of Elastic Agent Ids to event created date
  const endpointLastEventCreated: Record<string, Date> = latestEndpointMetadataDocs.reduce(
    (acc, endpointMetadata) => {
      acc[endpointMetadata.elastic.agent.id] = new Date(endpointMetadata.event.created);
      return acc;
    },
    {} as Record<string, Date>
  );

  for (const actionResponse of actionResponses) {
    const lastEndpointMetadataEventTimestamp = endpointLastEventCreated[actionResponse.agent_id];
    const actionCompletedAtTimestamp = new Date(actionResponse.completed_at);
    // If enough time has lapsed in checking for updated Endpoint metadata doc so that we don't keep
    // checking it forever.
    // It uses the `@timestamp` in order to ensure we are looking at times that were set by the server
    const enoughTimeHasLapsed =
      Date.now() - new Date(actionResponse['@timestamp']).getTime() >
      PENDING_ACTION_RESPONSE_MAX_LAPSED_TIME;

    if (
      !lastEndpointMetadataEventTimestamp ||
      enoughTimeHasLapsed ||
      lastEndpointMetadataEventTimestamp > actionCompletedAtTimestamp
    ) {
      actionResponsesByAgentId[actionResponse.agent_id].push(actionResponse);
    }
  }

  return actionResponsesByAgentId;
};
