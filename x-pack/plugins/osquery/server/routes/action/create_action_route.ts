/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import moment from 'moment';

import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { parseAgentSelection, AgentSelection } from '../../lib/parse_agent_groups';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import {
  createActionRequestBodySchema,
  CreateActionRequestBodySchema,
} from '../../../common/schemas/routes/action/create_action_request_body_schema';

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
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const soClient = context.core.savedObjects.client;
      const { agentSelection } = request.body as { agentSelection: AgentSelection };
      const selectedAgents = await parseAgentSelection(
        esClient,
        soClient,
        osqueryContext,
        agentSelection
      );

      if (!selectedAgents.length) {
        throw new Error('No agents found for selection, aborting.');
      }

      const action = {
        action_id: uuid.v4(),
        '@timestamp': moment().toISOString(),
        expiration: moment().add(1, 'days').toISOString(),
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        agents: selectedAgents,
        data: {
          id: uuid.v4(),
          query: request.body.query,
        },
      };
      const actionResponse = await esClient.index<{}, {}>({
        index: '.fleet-actions',
        body: action,
      });

      return response.ok({
        body: {
          response: actionResponse,
          actions: [action],
        },
      });
    }
  );
};
