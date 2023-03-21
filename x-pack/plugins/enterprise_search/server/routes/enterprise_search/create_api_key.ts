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

export function registerCreateAPIKeyRoute(
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
}
