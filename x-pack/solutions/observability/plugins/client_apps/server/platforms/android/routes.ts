/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { ANDROID_RETRACE_API_PATH } from '../../../common';
import { retrace } from './retrace';
import { handleRouteError } from '../../lib/handle_route_error';

export function registerAndroidRoutes({ router, logger }: { router: IRouter; logger: Logger }) {
  router.post(
    {
      path: ANDROID_RETRACE_API_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is scoped to internal use and does not require authorization yet',
        },
      },
      options: {
        tags: ['access:clientApps'],
      },
      validate: {
        body: schema.object({
          stacktrace: schema.string({ minLength: 1 }),
          build_id: schema.string({ minLength: 1 }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { stacktrace, build_id: buildId } = request.body;

        const resolved = await retrace({ esClient, stacktrace, buildId, logger });

        return response.ok({
          body: { original: stacktrace, resolved },
        });
      } catch (error) {
        return handleRouteError({ error, logger, response, message: 'Android retrace failed' });
      }
    }
  );
}
