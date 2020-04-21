/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { Fetcher } from './utils/fetch';
import { IndexPatternRetriever } from '../../index_pattern';

interface ChildrenQueryParams {
  // the rough approximation of how many children you can request per process, per level
  // really this only matters for the first level of children, every other level exponentially
  // increases this value
  children: number;
  generations: number;
  afterChild?: string;
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

interface ChildrenPathParams {
  id: string;
}

export const validateChildren = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    children: schema.number({ defaultValue: 10, min: 10, max: 100 }),
    generations: schema.number({ defaultValue: 3, min: 0, max: 3 }),
    afterChild: schema.maybe(schema.string()),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleChildren(
  log: Logger,
  indexRetriever: IndexPatternRetriever,
): RequestHandler<ChildrenPathParams, ChildrenQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { children, generations, afterChild, legacyEndpointID: endpointID },
    } = req;
    try {
      const client = context.core.elasticsearch.dataClient;
      const indexPattern = await indexRetriever.getEventIndexPattern(context);

      const fetcher = new Fetcher(client, id, indexPattern, endpointID);
      const tree = await fetcher.children(children, generations, afterChild);

      return res.ok({
        body: tree.render(),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
