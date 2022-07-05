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

export function registerCreateAPIKeyRoute(
  { router }: RouteDependencies,
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
    async (context, request, response) => {
      const { indexName } = request.params;
      const { keyName } = request.body;
      try {
        const createResponse = await createApiKey(request, security, indexName, keyName);
        if (!createResponse) {
          throw new Error('Unable to create API Key');
        }
        return response.ok({
          body: { apiKey: createResponse },
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return response.customError({
          body: 'Error creating API Key',
          statusCode: 502,
        });
      }
    }
  );
}
