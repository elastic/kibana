/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
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
        const validKeys = apiKeys.api_keys.filter(({ invalidated }) => !invalidated);
        return response.ok({ body: { apiKeys: validKeys } });
      }
      return response.customError({
        statusCode: 502,
        body: 'Could not retrieve current user, security plugin is not ready',
      });
    }
  );

  router.post(
    {
      path: '/internal/serverless_search/api_key',
      validate: {
        body: schema.any(),
      },
    },
    async (context, request, response) => {
      const result = await security.authc.apiKeys.create(request, request.body);
      if (result) {
        const apiKey = { ...result, beats_logstash_format: `${result.id}:${result.api_key}` };
        return response.ok({ body: apiKey });
      }
      return response.customError({
        statusCode: 502,
        body: 'Could not retrieve current user, security plugin is not ready',
      });
    }
  );
};
