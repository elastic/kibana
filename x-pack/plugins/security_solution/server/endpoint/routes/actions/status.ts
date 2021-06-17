/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
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

    // retrieve the unexpired actions for the given hosts
    const recentActionResults = await esClient.search<EndpointAction>(
      {
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
      },
      {
        ignore: [404],
      }
    );
    const pendingActions =
      recentActionResults.body?.hits?.hits?.map((a): EndpointAction => a._source!) || [];

    // retrieve any responses to those action IDs from these agents
    const actionIDs = pendingActions.map((a) => a.action_id);
    const responseResults = await esClient.search<EndpointActionResponse>(
      {
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
      },
      {
        ignore: [404],
      }
    );
    const actionResponses = responseResults.body?.hits?.hits?.map((a) => a._source!) || [];

    // respond with action-count per agent
    const response: EndpointPendingActions[] = agentIDs.map((aid) => {
      const responseIDsFromAgent = actionResponses
        .filter((r) => r.agent_id === aid)
        .map((r) => r.action_id);
      return {
        agent_id: aid,
        pending_actions: pendingActions
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

    return res.ok({
      body: {
        data: response,
      },
    });
  };
};
