/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { RouteDependencies } from '../../plugin';

export function registerCreateAPIKeyRoute({ router }: RouteDependencies, security: SecurityPluginStart) {
  router.get(
    { path: '/internal/enterprise_search/create_api_key', validate: false },
    async (context, request, response) => {
      try {
        const createResponse = await security.authc.apiKeys.create(request, {name: 'test-jgr-1', role_descriptors: {}});
        if (!createResponse) {
          throw "whoopsie";
        }
        return response.ok({
          body: { apiKey: createResponse },
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return response.customError({
          statusCode: 502,
          body: 'Error creating API Key',
        });
      }
    }
  );
}
