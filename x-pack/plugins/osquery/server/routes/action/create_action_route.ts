/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import moment from 'moment';

import { IRouter } from '../../../../../../src/core/server';

export const createActionRoute = (router: IRouter) => {
  router.post(
    {
      path: '/internal/osquery/action',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;
      const action = {
        action_id: uuid.v4(),
        '@timestamp': moment().toISOString(),
        expiration: moment().add(2, 'days').toISOString(),
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        // @ts-expect-error update validation
        agents: request.body.agents,
        data: {
          commands: [
            {
              id: uuid.v4(),
              // @ts-expect-error update validation
              query: request.body.command,
            },
          ],
        },
      };
      const query = await esClient.index<{}, {}>({
        index: '.fleet-actions',
        body: action,
      });

      return response.ok({
        body: {
          response: query,
          action,
        },
      });
    }
  );
};
