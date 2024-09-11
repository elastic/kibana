/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { GET_STATUS_ROUTE, GET_USER_PRIVILEGES_ROUTE } from '../../common/routes';
import { fetchIndicesStatus, fetchUserStartPrivileges } from '../lib/status';

export function registerStatusRoutes(router: IRouter, logger: Logger) {
  router.get(
    {
      path: GET_STATUS_ROUTE,
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const body = await fetchIndicesStatus(client, logger);

      return response.ok({
        body,
        headers: { 'content-type': 'application/json' },
      });
    }
  );

  router.get(
    {
      path: GET_USER_PRIVILEGES_ROUTE,
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const body = await fetchUserStartPrivileges(client, logger);

      return response.ok({
        body,
        headers: { 'content-type': 'application/json' },
      });
    }
  );
}
