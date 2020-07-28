/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, Logger } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { eventsIndexPattern, alertsIndexPattern } from '../../../../common/endpoint/constants';
import { validateTree } from '../../../../common/endpoint/schema/resolver';
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
        ancestors,
        events,
        alerts,
        afterAlert,
        afterEvent,
        afterChild,
        legacyEndpointID: endpointID,
      },
    } = req;
    try {
      const client = context.core.elasticsearch.legacy.client;

      const fetcher = new Fetcher(client, id, eventsIndexPattern, alertsIndexPattern, endpointID);

      const [childrenNodes, ancestry, relatedEvents, relatedAlerts] = await Promise.all([
        fetcher.children(children, afterChild),
        fetcher.ancestors(ancestors),
        fetcher.events(events, afterEvent),
        fetcher.alerts(alerts, afterAlert),
      ]);

      const tree = new Tree(id, {
        ancestry,
        children: childrenNodes,
        relatedEvents,
        relatedAlerts,
      });

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
