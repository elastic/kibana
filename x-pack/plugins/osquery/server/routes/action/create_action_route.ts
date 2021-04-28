/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import moment from 'moment';
import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { parseAgentSelection, AgentSelection } from '../../lib/parse_agent_groups';

export const createActionRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/action',
      validate: {
        body: schema.object({
          query: schema.string(),
          agentSelection: schema.object({
            agents: schema.arrayOf(schema.string()),
            allAgentsSelected: schema.boolean(),
            platformsSelected: schema.arrayOf(schema.string()),
            policiesSelected: schema.arrayOf(schema.string()),
          }),
        }),
      },
      options: {
        tags: ['access:osquery', 'access:osquery_write'],
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
