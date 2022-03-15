/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import uuid from 'uuid';
import moment from 'moment-timezone';

import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { parseAgentSelection, AgentSelection } from '../../lib/parse_agent_groups';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import {
  createActionRequestBodySchema,
  CreateActionRequestBodySchema,
} from '../../../common/schemas/routes/action/create_action_request_body_schema';

import { incrementCount } from '../usage';
import { getInternalSavedObjectsClient } from '../../usage/collector';

export const createActionRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/action',
      validate: {
        body: buildRouteValidation<
          typeof createActionRequestBodySchema,
          CreateActionRequestBodySchema
        >(createActionRequestBodySchema),
      },
      options: {
        tags: [`access:${PLUGIN_ID}-readLiveQueries`, `access:${PLUGIN_ID}-runSavedQueries`],
      },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );

      const { agentSelection } = request.body as { agentSelection: AgentSelection };
      const selectedAgents = await parseAgentSelection(
        internalSavedObjectsClient,
        osqueryContext,
        agentSelection
      );
      incrementCount(internalSavedObjectsClient, 'live_query');
      if (!selectedAgents.length) {
        incrementCount(internalSavedObjectsClient, 'live_query', 'errors');
        return response.badRequest({ body: new Error('No agents found for selection') });
      }

      // TODO: Add check for `runSavedQueries` only

      try {
        const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;
        const action = {
          action_id: uuid.v4(),
          '@timestamp': moment().toISOString(),
          expiration: moment().add(5, 'minutes').toISOString(),
          type: 'INPUT_ACTION',
          input_type: 'osquery',
          agents: selectedAgents,
          user_id: currentUser,
          data: pickBy(
            {
              id: uuid.v4(),
              query: request.body.query,
              saved_query_id: request.body.saved_query_id,
              ecs_mapping: request.body.ecs_mapping,
            },
            (value) => !isEmpty(value)
          ),
        };
        const actionResponse = await esClient.index({
          index: '.fleet-actions',
          body: action,
        });

        return response.ok({
          body: {
            response: actionResponse,
            actions: [action],
          },
        });
      } catch (error) {
        incrementCount(internalSavedObjectsClient, 'live_query', 'errors');
        return response.customError({
          statusCode: 500,
          body: new Error(`Error occurred while processing ${error}`),
        });
      }
    }
  );
};
