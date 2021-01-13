/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

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
      validate: false,
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;
      const query = await esClient.index<{}, {}>({
        index: '.fleet-actions',
        body: {
          action_id: uuid.v4(),
          '@timestamp': '2021-01-13T13:36:30Z',
          expiration: '2021-01-15T13:36:30Z',
          type: 'APP_ACTION',
          input_id: 'osquery',
          agents: ['8981bfa9-092e-4fa3-8c2d-d3a5a2fbaf5f'],
          data: {
            commands: [
              {
                id: uuid.v4(),
                query: 'select * from users',
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
