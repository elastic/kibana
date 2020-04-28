/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, Logger } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { validateTree } from '../../../common/schema/resolver';
import { Fetcher } from './utils/fetch';
import { Tree } from './utils/tree';
import { EndpointAppContext } from '../../types';

export function handleTree(
  log: Logger,
  endpointAppContext: EndpointAppContext
): RequestHandler<TypeOf<typeof validateTree.params>, TypeOf<typeof validateTree.query>> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: {
        children,
        generations,
        ancestors,
        events,
        afterEvent,
        afterChild,
        legacyEndpointID: endpointID,
      },
    } = req;
    try {
      const client = context.core.elasticsearch.dataClient;
      const indexRetriever = endpointAppContext.service.getIndexPatternRetriever();
      const indexPattern = await indexRetriever.getEventIndexPattern(context);

      const fetcher = new Fetcher(client, id, indexPattern, endpointID);
      const tree = await Tree.merge(
        fetcher.children(children, generations, afterChild),
        fetcher.ancestors(ancestors + 1),
        fetcher.events(events, afterEvent)
      );

      const enrichedTree = await fetcher.stats(tree);

      return res.ok({
        body: enrichedTree.render(),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: 'Error retrieving tree.' });
    }
  };
}
