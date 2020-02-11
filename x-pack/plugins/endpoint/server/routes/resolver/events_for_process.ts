/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { transformResults, getPaginationParams } from './common';
import { LifecycleQuery } from './queries/lifecycle';
import { RelatedEventsQuery } from './queries/related_events';

interface EventsForProcessQueryParams {
  after?: string;
  limit: number;
}

interface EventsForProcessPathParams {
  id: string;
}

export const validateEventsForProcess = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    after: schema.maybe(schema.string()),
    limit: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
  }),
};

export function handleEventsForProcess(
  log: Logger
): RequestHandler<EventsForProcessPathParams, EventsForProcessQueryParams> {
  return async (context, req, res) => {
    const entityID = req.params.id;
    try {
      const { limit, after } = req.query;
      log.debug(`entity_id: ${entityID} after: ${after} limit: ${limit}`);
      const pagination = await getPaginationParams(
        context.core.elasticsearch.dataClient,
        limit,
        after
      );
      log.debug(`pagination: JSON.stringify(pagination)`);

      // Retrieve the process lifecycle events (e.g. started, terminated etc)
      const lifecycleQuery = new LifecycleQuery().build(entityID);
      log.debug(`lifecycle query: ${JSON.stringify(lifecycleQuery)}`);
      const lifecycleResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        lifecycleQuery
      );
      const { results: lifecycleEvents } = transformResults(lifecycleResponse);

      // Retrieve the related non-process events for a given process
      const relatedEventsQuery = new RelatedEventsQuery(pagination).build(entityID);
      log.debug(`related events query: ${JSON.stringify(relatedEventsQuery)}`);
      const eventResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        relatedEventsQuery
      );
      const { total, results: events, lastDocument } = transformResults(eventResponse);
      log.debug(`total: ${total} last document: ${lastDocument}`);
      return res.ok({
        body: {
          lifecycle: lifecycleEvents,
          events,
          pagination: {
            total,
            next: lastDocument,
            limit,
          },
        },
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
