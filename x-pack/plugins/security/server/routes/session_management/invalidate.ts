/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';

/**
 * Defines routes required for session invalidation.
 */
export function defineInvalidateSessionsRoutes({ router, getSession }: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/security/session/_invalidate',
      validate: {
        body: schema.object({
          match: schema.oneOf([schema.literal('all'), schema.literal('query')]),
          query: schema.conditional(
            schema.siblingRef('match'),
            schema.literal('query'),
            schema.object({
              provider: schema.object({
                type: schema.string(),
                name: schema.maybe(schema.string()),
              }),
              username: schema.maybe(schema.string()),
            }),
            schema.never()
          ),
        }),
      },
      options: {
        tags: ['access:sessionManagement'],
        summary: `Invalidate user sessions`,
      },
    },
    async (_context, request, response) => {
      return response.ok({
        body: {
          total: await getSession().invalidate(request, {
            match: request.body.match,
            query: request.body.query,
          }),
        },
      });
    }
  );
}
