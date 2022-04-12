/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type {
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  Logger,
} from 'src/core/server';
import type { EventLogRouter, EventLogRequestHandlerContext } from '../types';

import { BASE_EVENT_LOG_API_PATH } from '../../common';
import { queryOptionsSchema, FindOptionsType } from '../event_log_client';

const paramSchema = schema.object({
  type: schema.string(),
});

const bodySchema = schema.object({
  ids: schema.arrayOf(schema.string(), { defaultValue: [] }),
  legacyIds: schema.arrayOf(schema.string(), { defaultValue: [] }),
});

export const findByIdsRoute = (router: EventLogRouter, systemLogger: Logger) => {
  router.post(
    {
      path: `${BASE_EVENT_LOG_API_PATH}/{type}/_find`,
      validate: {
        params: paramSchema,
        query: queryOptionsSchema,
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(async function (
      context: EventLogRequestHandlerContext,
      req: KibanaRequest<TypeOf<typeof paramSchema>, FindOptionsType, TypeOf<typeof bodySchema>>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      if (!context.eventLog) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for eventLog' });
      }
      const eventLogClient = (await context.eventLog).getEventLogClient();
      const {
        params: { type },
        body: { ids, legacyIds },
        query,
      } = req;

      try {
        return res.ok({
          body: await eventLogClient.findEventsBySavedObjectIds(type, ids, query, legacyIds),
        });
      } catch (err) {
        const call = `findEventsBySavedObjectIds(${type}, [${ids}], ${JSON.stringify(query)})`;
        systemLogger.debug(`error calling eventLog ${call}: ${err.message}`);
        return res.notFound();
      }
    })
  );
};
