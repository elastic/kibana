/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { Fetcher } from './utils/fetch';
import { Tree } from './utils/tree';
import { IndexPatternRetriever } from '../../index_pattern';

interface TreeQueryParams {
  // the rough approximation of how many children you can request per process, per level
  // really this only matters for the first level of children, every other level exponentially
  // increases this value
  children: number;
  generations: number;
  ancestors: number;
  events: number;
  afterAlert?: string;
  afterChild?: string;
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

interface TreePathParams {
  id: string;
}

export const validateTree = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    children: schema.number({ defaultValue: 10, min: 10, max: 100 }),
    generations: schema.number({ defaultValue: 3, min: 0, max: 3 }),
    ancestors: schema.number({ defaultValue: 3, min: 0, max: 5 }),
    events: schema.number({ defaultValue: 100, min: 0, max: 1000 }),
    afterEvent: schema.maybe(schema.string()),
    afterChild: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleTree(
  log: Logger,
  indexRetriever: IndexPatternRetriever
): RequestHandler<TreePathParams, TreeQueryParams> {
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
      return res.internalError({ body: err });
    }
  };
}
