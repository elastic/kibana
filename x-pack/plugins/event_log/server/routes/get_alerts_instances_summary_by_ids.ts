/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

const optionalDateFieldSchema = schema.maybe(
  schema.string({
    validate(value) {
      if (isNaN(Date.parse(value))) {
        return 'Invalid Date';
      }
    },
  })
);

const optionsSchema = schema.object({
  start: optionalDateFieldSchema,
  end: optionalDateFieldSchema,
});

const bodySchema = schema.object({
  ids: schema.arrayOf(schema.string(), { defaultValue: [] }),
});

export const getAlertsInstancesSummaryByIdsRoute = (
  router: EventLogRouter,
  systemLogger: Logger
) => {
  router.post(
    {
      path: `${BASE_EVENT_LOG_API_PATH}/_alerts_instances_summary`,
      validate: {
        query: optionsSchema,
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(async function (
      context: EventLogRequestHandlerContext,
      req: KibanaRequest<unknown, TypeOf<typeof optionsSchema>, TypeOf<typeof bodySchema>>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      if (!context.eventLog) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for eventLog' });
      }
      const eventLogClient = context.eventLog.getEventLogClient();
      const {
        body: { ids },
        query,
      } = req;

      try {
        return res.ok({
          body: await eventLogClient.getEventsForAlertInstancesSummary(ids, query.start, query.end),
        });
      } catch (err) {
        const call = `getEventsForAlertInstancesSummary([${ids}], ${JSON.stringify(query)})`;
        systemLogger.debug(`error calling eventLog ${call}: ${err.message}`);
        return res.notFound();
      }
    })
  );
};
