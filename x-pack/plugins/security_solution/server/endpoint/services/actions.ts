/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../fleet/common';
import { SecuritySolutionRequestHandlerContext } from '../../types';
import {
  ActivityLog,
  EndpointAction,
  EndpointActionResponse,
  EndpointPendingActions,
} from '../../../common/endpoint/types';

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
  startDate?: string;
  endDate?: string;
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
}): Promise<ActivityLog> => {
  const size = Math.floor(pageSize / 2);
  const from = page <= 1 ? 0 : page * size - size + 1;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const data = await getActivityLog({
    esClient,
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
  esClient,
  size,
  from,
  startDate,
  endDate,
  elasticAgentId,
  logger,
}: {
  esClient: ElasticsearchClient;
  elasticAgentId: string;
  size: number;
  from: number;
  startDate?: string;
  endDate?: string;
  logger: Logger;
}) => {
  const options = {
    headers: {
      'X-elastic-product-origin': 'fleet',
    },
    ignore: [404],
  };

  let actionsResult;
  let responsesResult;
  const dateFilters = [];
  if (startDate) {
    dateFilters.push({ range: { '@timestamp': { gte: startDate } } });
  }
  if (endDate) {
    dateFilters.push({ range: { '@timestamp': { lte: endDate } } });
  }

  try {
    // fetch actions with matching agent_id
    const baseActionFilters = [
      { term: { agents: elasticAgentId } },
      { term: { input_type: 'endpoint' } },
      { term: { type: 'INPUT_ACTION' } },
    ];
    const actionsFilters = [...baseActionFilters, ...dateFilters];
    actionsResult = await esClient.search(
      {
        index: AGENT_ACTIONS_INDEX,
        size,
        from,
        body: {
          query: {
            bool: {
              // @ts-ignore
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
      },
      options
    );
    const actionIds = actionsResult?.body?.hits?.hits?.map(
      (e) => (e._source as EndpointAction).action_id
    );

    // fetch responses with matching `action_id`s
    const baseResponsesFilter = [
      { term: { agent_id: elasticAgentId } },
      { terms: { action_id: actionIds } },
    ];
    const responsesFilters = [...baseResponsesFilter, ...dateFilters];
    responsesResult = await esClient.search(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        size: 1000,
        body: {
          query: {
            bool: {
              filter: responsesFilters,
            },
          },
        },
      },
      options
    );
  } catch (error) {
    logger.error(error);
    throw error;
  }
  if (actionsResult?.statusCode !== 200) {
    logger.error(`Error fetching actions log for agent_id ${elasticAgentId}`);
    throw new Error(`Error fetching actions log for agent_id ${elasticAgentId}`);
  }

  const responses = responsesResult?.body?.hits?.hits?.length
    ? responsesResult?.body?.hits?.hits?.map((e) => ({
        type: 'response',
        item: { id: e._id, data: e._source },
      }))
    : [];
  const actions = actionsResult?.body?.hits?.hits?.length
    ? actionsResult?.body?.hits?.hits?.map((e) => ({
        type: 'action',
        item: { id: e._id, data: e._source },
      }))
    : [];
  const sortedData = ([...responses, ...actions] as ActivityLog['data']).sort((a, b) =>
    new Date(b.item.data['@timestamp']) > new Date(a.item.data['@timestamp']) ? 1 : -1
  );

  return sortedData;
};

export const getPendingActionCounts = async (
  esClient: ElasticsearchClient,
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
    .then((result) => result.body?.hits?.hits?.map((a) => a._source!) || []);

  // retrieve any responses to those action IDs from these agents
  const actionIDs = recentActions.map((a) => a.action_id);
  const responses = await esClient
    .search<EndpointActionResponse>(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        size: 10000,
        from: 0,
        body: {
          query: {
            bool: {
              filter: [
                { terms: { action_id: actionIDs } }, // get results for these actions
                { terms: { agent_id: agentIDs } }, // ignoring responses from agents we're not looking for
              ],
            },
          },
        },
      },
      { ignore: [404] }
    )
    .then((result) => result.body?.hits?.hits?.map((a) => a._source!) || []);

  // respond with action-count per agent
  const pending: EndpointPendingActions[] = agentIDs.map((aid) => {
    const responseIDsFromAgent = responses
      .filter((r) => r.agent_id === aid)
      .map((r) => r.action_id);
    return {
      agent_id: aid,
      pending_actions: recentActions
        .filter((a) => a.agents.includes(aid) && !responseIDsFromAgent.includes(a.action_id))
        .map((a) => a.data.command)
        .reduce((acc, cur) => {
          if (cur in acc) {
            acc[cur] += 1;
          } else {
            acc[cur] = 1;
          }
          return acc;
        }, {} as EndpointPendingActions['pending_actions']),
    };
  });

  return pending;
};
