/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { Fetcher } from './utils/fetch';
import { IndexPatternRetriever } from '../../index_pattern';

interface EventsQueryParams {
  events: number;
  afterEvent?: string;
  /**
   * legacyEndpointID is optional because there are two different types of identifiers:
   *
   * Legacy
   * A legacy Entity ID is made up of the agent.id and unique_pid fields. The client will need to identify if
   * it's looking at a legacy event and use those fields when making requests to the backend. The
   * request would be /resolver/{id}?legacyEndpointID=<some uuid>and the {id} would be the unique_pid.
   *
   * Elastic Endpoint
   * When interacting with the new form of data the client doesn't need the legacyEndpointID because it's already a
   * part of the entityID in the new type of event. So for the same request the client would just hit resolver/{id}
   * and the {id} would be entityID stored in the event's process.entity_id field.
   */
  legacyEndpointID?: string;
}

interface EventsPathParams {
  id: string;
}

export const validateEvents = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    events: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
    afterEvent: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleEvents(
  log: Logger,
  indexRetriever: IndexPatternRetriever
): RequestHandler<EventsPathParams, EventsQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { events, afterEvent, legacyEndpointID: endpointID },
    } = req;
    try {
      const client = context.core.elasticsearch.dataClient;
      const indexPattern = await indexRetriever.getEventIndexPattern(context);

      const fetcher = new Fetcher(client, id, indexPattern, endpointID);
      const tree = await fetcher.events(events, afterEvent);

      return res.ok({
        body: tree.render(),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
