/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import moment from 'moment';

import { IRouter } from '../../../../../src/core/server';

export function defineRoutes(router: IRouter) {
  router.post(
    {
      path: '/api/osquery/queries',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;
      const query = await esClient.index<{}, {}>({
        index: '.fleet-actions-new',
        body: {
          action_id: uuid.v4(),
          '@timestamp': moment().toISOString(),
          expiration: moment().add(2, 'days').toISOString(),
          type: 'APP_ACTION',
          input_id: 'osquery',
          // @ts-expect-error
          agents: request.body.agents,
          data: {
            commands: [
              {
                id: uuid.v4(),
                // @ts-expect-error
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
