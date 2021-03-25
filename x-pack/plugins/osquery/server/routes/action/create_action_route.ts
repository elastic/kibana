/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { createActionHandler } from '../../handlers';

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
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const { response: actionResponse, actions } = await createActionHandler(
        esClient,
        request.body
      );

      return response.ok({
        body: {
          response: actionResponse,
          actions,
        },
      });
    }
  );
};
