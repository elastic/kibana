/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SecurityPluginStart } from '@kbn/security-plugin/server';

import { createApiKey } from '../../lib/indices/create_api_key';
import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerApiKeysRoutes(
  { log, router }: RouteDependencies,
  security: SecurityPluginStart
) {
  router.post(
    {
      path: '/internal/enterprise_search/{indexName}/api_keys',
      validate: {
        body: schema.object({
          keyName: schema.string(),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { keyName } = request.body;

      const createResponse = await createApiKey(request, security, indexName, keyName);

      if (!createResponse) {
        throw new Error('Unable to create API Key');
      }

      return response.ok({
        body: { apiKey: createResponse },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
  router.get(
    {
      path: '/internal/enterprise_search/api_keys',
      validate: {},
    },
    async (context, request, response) => {
      const core = await context.core;
      const { client } = core.elasticsearch;
      const user = core.security.authc.getCurrentUser();
      if (user) {
        try {
          const apiKeys = await client.asCurrentUser.security.getApiKey({
            username: user.username,
          });
          const validKeys = apiKeys.api_keys.filter(({ invalidated }) => !invalidated);
          return response.ok({ body: { api_keys: validKeys } });
        } catch {
          // Ideally we check the error response here for unauthorized user
          // Unfortunately the error response is not structured enough for us to filter those
          // Always returning an empty array should also be fine, and deals with transient errors

          return response.ok({ body: { api_keys: [] } });
        }
      }
      return response.customError({
        body: 'Could not retrieve current user, security plugin is not ready',
        statusCode: 502,
      });
    }
  );

  router.post(
    {
      path: '/internal/enterprise_search/api_keys',
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
        body: 'Could not retrieve current user, security plugin is not ready',
        statusCode: 502,
      });
    }
  );
}
