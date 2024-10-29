/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteDependencies } from '../plugin';
import { errorHandler } from '../utils/error_handler';

export const registerApiKeyRoutes = ({ logger, router, getSecurity }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/api_keys',
      validate: {},
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      const { client } = core.elasticsearch;
      const user = core.security.authc.getCurrentUser();
      if (user) {
        const privileges = await client.asCurrentUser.security.hasPrivileges({
          cluster: ['manage_own_api_key'],
        });
        const canManageOwnApiKey = privileges?.cluster.manage_own_api_key;

        try {
          const apiKeys = await client.asCurrentUser.security.getApiKey({
            username: user.username,
          });

          const validKeys = apiKeys.api_keys.filter(({ invalidated }) => !invalidated);
          return response.ok({ body: { apiKeys: validKeys, canManageOwnApiKey } });
        } catch {
          return response.ok({ body: { apiKeys: [], canManageOwnApiKey } });
        }
      }
      return response.customError({
        statusCode: 502,
        body: 'Could not retrieve current user, security plugin is not ready',
      });
    })
  );

  router.post(
    {
      path: '/internal/serverless_search/api_key',
      validate: {
        body: schema.any(),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const security = await getSecurity();

      const result = await security.authc.apiKeys.create(request, request.body);
      if (result) {
        const apiKey = { ...result, beats_logstash_format: `${result.id}:${result.api_key}` };
        return response.ok({ body: apiKey });
      }
      return response.customError({
        statusCode: 502,
        body: 'Could not retrieve current user, security plugin is not ready',
      });
    })
  );
};
