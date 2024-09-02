/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { fetchUserStartPrivileges } from '../lib/privileges';

export function registerRoutes(router: IRouter, logger: Logger) {
  router.get(
    {
      path: '/internal/search_api_keys/create',
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const body = await fetchUserStartPrivileges(client, logger);

      if (body.privileges.canCreateApiKeys) {
        return response.ok({
          body: { apiKey: '123456789' },
          headers: { 'content-type': 'application/json' },
        });
      } else {
        throw new Error('Unauthorized');
      }
    }
  );
}
