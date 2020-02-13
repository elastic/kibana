/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { getPaginationParams } from './utils/pagination';
import { RelatedEventsQuery } from './queries/related_events';

interface RelatedEventsQueryParams {
  after?: string;
  limit: number;
  legacyEndpointID?: string;
}

interface RelatedEventsPathParams {
  id: string;
}

export const validateRelatedEvents = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    after: schema.maybe(schema.string()),
    limit: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleRelatedEvents(
  log: Logger
): RequestHandler<RelatedEventsPathParams, RelatedEventsQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { limit, after, legacyEndpointID },
    } = req;
    try {
      const pagination = getPaginationParams(limit, after);

      const client = context.core.elasticsearch.dataClient;
      // Retrieve the related non-process events for a given process
      const relatedEventsQuery = new RelatedEventsQuery(legacyEndpointID, pagination);
      const relatedEvents = await relatedEventsQuery.search(client, id);

      const { total, results: events, next } = relatedEvents;

      return res.ok({
        body: {
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
