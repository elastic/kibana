/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { eventsIndexPattern } from '../../../../common/endpoint/constants';
import { validateEvents } from '../../../../common/endpoint/schema/resolver';
import { EventsQuery } from './queries/events';
import { createEvents } from './utils/node';
import { PaginationBuilder } from './utils/pagination';

/**
 * This function handles the `/events` api and returns an array of events and a cursor if more events exist than were
 * requested.
 * @param log a logger object
 */
export function handleEvents(
  log: Logger
): RequestHandler<
  unknown,
  TypeOf<typeof validateEvents.query>,
  TypeOf<typeof validateEvents.body>
> {
  return async (context, req, res) => {
    const {
      query: { limit, afterEvent },
      body,
    } = req;
    try {
      const client = context.core.elasticsearch.client;
      const query = new EventsQuery(
        PaginationBuilder.createBuilder(limit, afterEvent),
        eventsIndexPattern
      );
      const results = await query.search(client, body?.filter);

      return res.ok({
        body: createEvents(results, PaginationBuilder.buildCursorRequestLimit(limit, results)),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
