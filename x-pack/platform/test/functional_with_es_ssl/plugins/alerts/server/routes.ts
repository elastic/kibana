/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { queryOptionsSchema } from '@kbn/event-log-plugin/server/event_log_client';
import type { AlertingExampleDeps } from './plugin';

export const registerRoutes = (core: CoreSetup<AlertingExampleDeps>) => {
  const router = core.http.createRouter();

  router.get(
    {
      path: '/_test/event_log/{type}/{id}/_find',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        query: queryOptionsSchema,
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const [, { eventLog }] = await core.getStartServices();
      const eventLogClient = eventLog.getClient(req);
      const {
        params: { id, type },
        query,
      } = req;

      try {
        return res.ok({
          body: await eventLogClient.findEventsBySavedObjectIds(type, [id], query),
        });
      } catch (err) {
        return res.notFound();
      }
    }
  );
};
