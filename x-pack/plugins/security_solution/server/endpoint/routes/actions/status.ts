/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import {
  EndpointAction,
  EndpointActionResponse,
  EndpointPendingActions,
} from '../../../../common/endpoint/types';
import { AGENT_ACTIONS_INDEX } from '../../../../../fleet/common';
import { ActionStatusRequestSchema } from '../../../../common/endpoint/schema/actions';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { EndpointAppContext } from '../../types';

/**
 * Registers routes for checking status of endpoints based on pending actions
 */
export function registerActionStatusRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  router.get(
    {
      path: ACTION_STATUS_ROUTE,
      validate: ActionStatusRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    actionStatusRequestHandler(endpointContext)
  );
}

export const actionStatusRequestHandler = function (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  TypeOf<typeof ActionStatusRequestSchema.query>,
  unknown,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, req, res) => {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const agentIDs: string[] = Array.isArray(req.query.agent_ids)
      ? [...new Set(req.query.agent_ids)]
      : [req.query.agent_ids];

    const response = await getPendingActions(esClient, agentIDs);

    return res.ok({
      body: {
        data: response,
      },
    });
  };
};

const getPendingActions = async (
  esClient: ElasticsearchClient,
  agentIDs: string[]
): Promise<EndpointPendingActions[]> => {
  // retrieve the unexpired actions for the given hosts

  const recentActions = await searchUntilEmpty<EndpointAction>(esClient, {
    index: AGENT_ACTIONS_INDEX,
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
  });

  // retrieve any responses to those action IDs from these agents
  const actionIDs = recentActions.map((a) => a.action_id);
  const responses = await searchUntilEmpty<EndpointActionResponse>(esClient, {
    index: '.fleet-actions-results',
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
  });

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

const searchUntilEmpty = async <T>(
  esClient: ElasticsearchClient,
  query: SearchRequest,
  pageSize: number = 1000
): Promise<T[]> => {
  const results: T[] = [];

  for (let i = 0; ; i++) {
    const result = await esClient.search<T>(
      {
        size: pageSize,
        from: i * pageSize,
        ...query,
      },
      {
        ignore: [404],
      }
    );
    if (!result || !result.body?.hits?.hits || result.body?.hits?.hits?.length === 0) {
      break;
    }

    const response = result.body?.hits?.hits?.map((a) => a._source!) || [];
    results.push(...response);
  }

  return results;
};
