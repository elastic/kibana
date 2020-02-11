/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-classes-per-file */
import { RequestHandler, Logger } from 'kibana/server';
import { transformResults, getPaginationParams } from './common';
import { LifecycleQuery } from './queries/lifecycle';
import { RelatedEventsQuery } from './queries/related_events';

export interface EventsForProcessQueryParams {
  after?: string;
  limit: number;
}

export interface EventsForProcessPathParams {
  id: string;
}

export function handleEventsForProcess(
  log: Logger
): RequestHandler<EventsForProcessPathParams, EventsForProcessQueryParams> {
  return async (context, req, res) => {
    const entityID = req.params.id;
    log.debug(`entity_id: ${entityID}`);
    try {
      const { limit, after } = req.query;
      const pagination = await getPaginationParams(
        context.core.elasticsearch.dataClient,
        limit,
        after
      );
      const eventResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        new RelatedEventsQuery(pagination).build(entityID)
      );

      const lifecycleResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        new LifecycleQuery().build(entityID)
      );
      const { total, results: events } = transformResults(eventResponse);

      return res.ok({
        body: {
          lifecycle: transformResults(lifecycleResponse).results,
          events,
          pagination: {
            total,
          },
        },
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
