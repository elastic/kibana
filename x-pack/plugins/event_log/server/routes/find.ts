/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { BASE_EVENT_LOG_API_PATH } from '../../common';
import { findOptionsSchema, FindOptionsType } from '../event_log_client';

const paramSchema = schema.object({
  type: schema.string(),
  id: schema.string(),
});

export const findRoute = (router: IRouter) => {
  router.get(
    {
      path: `${BASE_EVENT_LOG_API_PATH}/{type}/{id}/_find`,
      validate: {
        params: paramSchema,
        query: findOptionsSchema,
      },
    },
    router.handleLegacyErrors(async function (
      context: RequestHandlerContext,
      req: KibanaRequest<TypeOf<typeof paramSchema>, FindOptionsType, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      if (!context.eventLog) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for eventLog' });
      }
      const eventLogClient = context.eventLog.getEventLogClient();
      const {
        params: { id, type },
        query,
      } = req;
      return res.ok({
        body: await eventLogClient.findEventsBySavedObject(type, id, query),
      });
    })
  );
};
