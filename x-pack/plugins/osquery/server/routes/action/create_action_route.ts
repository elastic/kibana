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
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
      options: {
        tags: ['access:osquery', 'access:osquery_write'],
      },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const { agentSelection } = request.body as { agentSelection: AgentSelection };
      const selectedAgents = await parseAgentSelection(esClient, osqueryContext, agentSelection);

      const action = {
        action_id: uuid.v4(),
        '@timestamp': moment().toISOString(),
        expiration: moment().add(1, 'days').toISOString(),
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        agents: selectedAgents,
        data: {
          // @ts-expect-error update validation
          id: request.body.query.id ?? uuid.v4(),
          // @ts-expect-error update validation
          query: request.body.query.query,
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
