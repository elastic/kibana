/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { validateEvents } from '../../../common/schema/resolver';
import { Fetcher } from './utils/fetch';
import { EndpointAppContext } from '../../types';

export function handleEvents(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<TypeOf<typeof validateEvents.params>, TypeOf<typeof validateEvents.query>> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { events, afterEvent, legacyEndpointID: endpointID },
    } = req;
    try {
      const indexRetriever = endpointAppContext.service.getIndexPatternRetriever();
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
