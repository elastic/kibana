/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type {
  IKibanaResponse,
  KibanaResponseFactory,
} from '../../../../../src/core/server/http/router/response';
import { BASE_EVENT_LOG_API_PATH } from '../../common';
import type { FindOptionsType } from '../event_log_client';
import { findOptionsSchema } from '../event_log_client';
import type { EventLogRequestHandlerContext, EventLogRouter } from '../types';

const paramSchema = schema.object({
  type: schema.string(),
  id: schema.string(),
});

export const findRoute = (router: EventLogRouter, systemLogger: Logger) => {
  router.get(
    {
      path: `${BASE_EVENT_LOG_API_PATH}/{type}/{id}/_find`,
      validate: {
        params: paramSchema,
        query: findOptionsSchema,
      },
    },
    router.handleLegacyErrors(async function (
      context: EventLogRequestHandlerContext,
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

      try {
        return res.ok({
          body: await eventLogClient.findEventsBySavedObjectIds(type, [id], query),
        });
      } catch (err) {
        const call = `findEventsBySavedObjectIds(${type}, [${id}], ${JSON.stringify(query)})`;
        systemLogger.debug(`error calling eventLog ${call}: ${err.message}`);
        return res.notFound();
      }
    })
  );
};
