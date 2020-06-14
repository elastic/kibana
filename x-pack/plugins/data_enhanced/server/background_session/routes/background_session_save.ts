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
  SavedObject,
  RequestHandlerContext,
} from 'kibana/server';
import { BackgroundSessionSavedObjectAttributes } from '../../../common/background_session';
import { BackgroundSessionParams } from './types';

const paramSchema = schema.object({
  sessionId: schema.string(),
});

export function registerBackgroundSessionSaveRoute(router: IRouter): void {
  router.post(
    {
      path: '/internal/session/{sessionId}/save',
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
        const savedObject: SavedObject<BackgroundSessionSavedObjectAttributes> = await context.backgroundSession!.store(
          request,
          sessionId
        );
        return res.ok({ body: savedObject });
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
