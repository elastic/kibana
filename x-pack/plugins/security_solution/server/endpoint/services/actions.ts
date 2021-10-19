/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';
import { SearchHit, SearchResponse } from '@elastic/elasticsearch/api/types';
import { ApiResponse } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../fleet/common';
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
  let actionsResult: ApiResponse<SearchResponse<unknown>, unknown>;
  let responsesResult: ApiResponse<SearchResponse<unknown>, unknown>;

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
      SearchHit<EndpointActionResponse | LogsEndpointActionResponse>
    >,
  });

  // label record as `response`, `fleetResponse`
  const actions = categorizeActionResults({
    results: actionsResult?.body?.hits?.hits as Array<
      SearchHit<EndpointAction | LogsEndpointAction>
    >,
  });

  // filter out the duplicate endpoint actions that also have fleetActions
  // include endpoint actions that have no fleet actions
  const uniqueLogData = getUniqueLogData([...responses, ...actions]);

  // sort by @timestamp in desc order, newest first
  const sortedData = getTimeSortedData(uniqueLogData);

  return sortedData;
};

export const getPendingActionCounts = async (
  esClient: ElasticsearchClient,
  metadataService: EndpointMetadataService,
  /** The Fleet Agent IDs to be checked */
  agentIDs: string[]
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
    .then((result) => result.body?.hits?.hits?.map((a) => a._source!) || [])
    .catch(catchAndWrapError);

  // retrieve any responses to those action IDs from these agents
  const responses = await fetchActionResponseIds(
    esClient,
    metadataService,
    recentActions.map((a) => a.action_id),
    agentIDs
  );
  const pending: EndpointPendingActions[] = [];

  for (const agentId of agentIDs) {
    const responseIDsFromAgent = responses[agentId];

    pending.push({
      agent_id: agentId,
      pending_actions: recentActions
        .filter((a) => a.agents.includes(agentId) && !responseIDsFromAgent.includes(a.action_id))
        .map((a) => a.data.command)
        .reduce((acc, cur) => {
          if (cur in acc) {
            acc[cur] += 1;
          } else {
            acc[cur] = 1;
          }
          return acc;
        }, {} as EndpointPendingActions['pending_actions']),
    });
  }

  return pending;
};

/**
 * Returns back a map of elastic Agent IDs to array of Action IDs that have received a response.
 *
 * @param esClient
 * @param metadataService
 * @param actionIds
 * @param agentIds
 */
const fetchActionResponseIds = async (
  esClient: ElasticsearchClient,
  metadataService: EndpointMetadataService,
  actionIds: string[],
  agentIds: string[]
): Promise<Record<string, string[]>> => {
  const actionResponsesByAgentId: Record<string, string[]> = agentIds.reduce((acc, agentId) => {
    acc[agentId] = [];
    return acc;
  }, {} as Record<string, string[]>);

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
    .then((result) => result.body?.hits?.hits?.map((a) => a._source!) || [])
    .catch(catchAndWrapError);

  if (actionResponses.length === 0) {
    return actionResponsesByAgentId;
  }

  // Get the latest docs from the metadata datastream for the Elastic Agent IDs in the action responses
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
      actionResponsesByAgentId[actionResponse.agent_id].push(actionResponse.action_id);
    }
  }

  return actionResponsesByAgentId;
};
