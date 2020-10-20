/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';

export function registerCredentialsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
  router.get(
    {
      path: '/api/app_search/credentials',
      validate: {
        query: schema.object({
          'page[current]': schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/credentials/collection',
    })
  );
  router.get(
    {
      path: '/api/app_search/credentials/details',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/credentials/details',
    })
  );
  router.delete(
    {
      path: '/api/app_search/credentials/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/as/credentials/${request.params.name}`,
      })(context, request, response);
    }
  );
}
