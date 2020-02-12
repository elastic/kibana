/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { getPaginationParams } from './pagination';
import { LifecycleQuery } from './queries/lifecycle';
import { RelatedEventsQuery } from './queries/related_events';

interface EventsQueryParams {
  after?: string;
  limit: number;
}

interface EventsPathParams {
  id: string;
}

export const validateEvents = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    after: schema.maybe(schema.string()),
    limit: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
  }),
};

export function handleEvents(log: Logger): RequestHandler<EventsPathParams, EventsQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { limit, after },
    } = req;
    try {
      const client = context.core.elasticsearch.dataClient;
      const pagination = await getPaginationParams(client, limit, after);

      // Retrieve the related non-process events for a given process
      const relatedEventsQuery = new RelatedEventsQuery(id, pagination);
      // Retrieve the process lifecycle events (e.g. started, terminated etc)
      const lifecycleQuery = new LifecycleQuery(id);

      const [relatedEvents, lifecycleEvents] = await Promise.all([
        relatedEventsQuery.search(client),
        lifecycleQuery.search(client),
      ]);
      const { total, results: events, next } = relatedEvents;
      const { results: lifecycle } = lifecycleEvents;

      return res.ok({
        body: {
          lifecycle,
          events,
          pagination: { total, next, limit },
        },
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
