/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

const tokenSchema = schema.oneOf([
  schema.object({
    name: schema.string(),
    type: schema.literal('admin'),
  }),
  schema.object({
    name: schema.string(),
    type: schema.literal('private'),
    read: schema.boolean(),
    write: schema.boolean(),
    access_all_engines: schema.boolean(),
    engines: schema.maybe(schema.arrayOf(schema.string())),
  }),
  schema.object({
    name: schema.string(),
    type: schema.literal('search'),
    access_all_engines: schema.boolean(),
    engines: schema.maybe(schema.arrayOf(schema.string())),
  }),
]);

export function registerCredentialsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  // Credentials API
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
  router.post(
    {
      path: '/api/app_search/credentials',
      validate: {
        body: tokenSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/credentials/collection',
    })
  );

  // TODO: It would be great to remove this someday
  router.get(
    {
      path: '/api/app_search/credentials/details',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/credentials/details',
    })
  );

  // Single credential API
  router.put(
    {
      path: '/api/app_search/credentials/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: tokenSchema,
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/as/credentials/${request.params.name}`,
      })(context, request, response);
    }
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
