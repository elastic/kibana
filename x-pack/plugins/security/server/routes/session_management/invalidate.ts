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
export function defineInvalidateSessionsRoutes({
  router,
  getSession,
  buildFlavor,
}: RouteDefinitionParams) {
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
      security: {
        authz: {
          requiredPrivileges: ['sessionManagement'],
        },
      },
      options: {
        // The invalidate session API was introduced to address situations where the session index
        // could grow rapidly - when session timeouts are disabled, or with anonymous access.
        // In the serverless environment, sessions timeouts are always be enabled, and there is no
        // anonymous access. However, keeping this endpoint available internally in serverless would
        // be useful in situations where we need to batch-invalidate user sessions.
        access: buildFlavor === 'serverless' ? 'internal' : 'public',

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
