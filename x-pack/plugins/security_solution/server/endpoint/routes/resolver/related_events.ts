/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * @deprecated use the `resolver/events` route and handler instead
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { eventsIndexPattern, alertsIndexPattern } from '../../../../common/endpoint/constants';
import { validateRelatedEvents } from '../../../../common/endpoint/schema/resolver';
import { Fetcher } from './utils/fetch';
import { EndpointAppContext } from '../../types';

export function handleRelatedEvents(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof validateRelatedEvents.params>,
  TypeOf<typeof validateRelatedEvents.query>,
  TypeOf<typeof validateRelatedEvents.body>
> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { events, afterEvent, legacyEndpointID: endpointID },
      body,
    } = req;
    try {
      const client = context.core.elasticsearch.legacy.client;

      const fetcher = new Fetcher(client, id, eventsIndexPattern, alertsIndexPattern, endpointID);

      return res.ok({
        body: await fetcher.events(events, afterEvent, body?.filter),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
