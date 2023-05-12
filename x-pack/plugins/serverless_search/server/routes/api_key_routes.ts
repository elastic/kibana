/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CreateAPIKeyArgs } from '../../common/types';
import { RouteDependencies } from '../plugin';

export const registerApiKeyRoutes = ({ logger, router, security }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/api_keys',
      validate: {},
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const user = security.authc.getCurrentUser(request);
      if (user) {
        const apiKeys = await client.asCurrentUser.security.getApiKey({ username: user.username });
        return response.ok({ body: { apiKeys: apiKeys.api_keys } });
      }
      return response.customError({
        statusCode: 502,
        body: 'Could not retrieve current user, security plugin is not ready',
      });
    }
  );
  router.post(
    {
      path: '/internal/serverless_search/api_keys',
      validate: {
        body: schema.object({
          expiration: schema.maybe(schema.string()),
          metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          name: schema.string(),
          role_descriptors: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const createApiArgs: CreateAPIKeyArgs = request.body;
      const apiKey = await client.asCurrentUser.security.createApiKey(createApiArgs);
      return response.ok({ body: { apiKey } });
    }
  );
};
