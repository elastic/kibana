/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import {
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
} from 'kibana/server';
import { BackgroundSessionParams } from './types';

const paramSchema = schema.object({
  sessionId: schema.string(),
});

export function registerBackgroundSessionGetRoute(router: IRouter): void {
  router.get(
    {
      path: '/internal/session/{sessionId}',
      validate: {
        params: paramSchema,
      },
    },
    async (
      context: RequestHandlerContext,
      request: KibanaRequest<BackgroundSessionParams>,
      res: KibanaResponseFactory
    ) => {
      const { sessionId } = request.params;

      try {
        const backgroundSearch = await context.backgroundSession!.get(request, sessionId);
        return res.ok({ body: backgroundSearch });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );
}
