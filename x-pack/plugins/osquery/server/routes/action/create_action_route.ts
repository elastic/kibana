/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import uuid from 'uuid';
import moment from 'moment-timezone';

import { IRouter } from '@kbn/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { parseAgentSelection, AgentSelection } from '../../lib/parse_agent_groups';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import {
  createActionRequestBodySchema,
  CreateActionRequestBodySchema,
} from '../../../common/schemas/routes/action/create_action_request_body_schema';

import { incrementCount } from '../usage';
import { getInternalSavedObjectsClient } from '../../usage/collector';
import { savedQuerySavedObjectType } from '../../../common/types';

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
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;
      const soClient = coreContext.savedObjects.client;
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const [coreStartServices] = await osqueryContext.getStartServices();
      let savedQueryId = request.body.saved_query_id;

      const {
        osquery: { writeLiveQueries, runSavedQueries },
      } = await coreStartServices.capabilities.resolveCapabilities(request);

      const isInvalid = !(writeLiveQueries || (runSavedQueries && request.body.saved_query_id));

      if (isInvalid) {
        return response.forbidden();
      }

      if (request.body.saved_query_id && runSavedQueries) {
        const savedQueries = await soClient.find({
          type: savedQuerySavedObjectType,
        });
        const actualSavedQuery = savedQueries.saved_objects.find(
          (savedQuery) => savedQuery.id === request.body.saved_query_id
        );

        if (actualSavedQuery) {
          savedQueryId = actualSavedQuery.id;
        }
      }

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
              saved_query_id: savedQueryId,
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
