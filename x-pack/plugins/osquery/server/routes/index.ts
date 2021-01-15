/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../src/core/server';

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/osquery/example',
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          time: new Date().toISOString(),
        },
      });
    }
  );

  router.post(
    {
      path: '/api/osquery/queries',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      console.log(request);
      console.log(JSON.stringify(request.body, null, 2));
      const esClient = context.core.elasticsearch.client.asInternalUser;
      const query = await esClient.index<{}, {}>({
        index: '.fleet-actions',
        body: {
          action_id: uuid.v4(),
          '@timestamp': '2021-01-13T13:36:30Z',
          expiration: '2021-01-15T13:36:30Z',
          type: 'APP_ACTION',
          input_id: 'osquery',
          agents: request.body.agents,
          data: {
            commands: [
              {
                id: uuid.v4(),
                query: request.body.command.query,
              },
            ],
          },
        },
      });
      return response.ok({
        body: query,
      });
    }
  );
}
