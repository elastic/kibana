/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { getChildren, getAncestors, getRelated } from './shared';
import { Tree } from './utils/tree';

interface TreeQueryParams {
  // the rough approximation of how many children you can request per process, per level
  // really this only matters for the first level of children, every other level exponentially
  // increases this value
  limit: number;
  levels: number;
  ancestors: number;
  related: number;
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
    limit: schema.number({ defaultValue: 10, min: 10, max: 100 }),
    levels: schema.number({ defaultValue: 3, min: 1, max: 3 }),
    ancestors: schema.number({ defaultValue: 3, min: 3, max: 5 }),
    related: schema.number({ defaultValue: 100, min: 100, max: 1000 }),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleTree(log: Logger): RequestHandler<TreePathParams, TreeQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { limit, legacyEndpointID, levels, ancestors: ancestorLevels, related },
    } = req;
    try {
      const client = context.core.elasticsearch.dataClient;
      const tree = new Tree(id, limit);

      const [, ancestorResponse, relatedResponse] = await Promise.all([
        getChildren({ client, tree, ids: [id], limit, levels, legacyEndpointID }),
        getAncestors(client, ancestorLevels + 1, id, legacyEndpointID),
        getRelated(client, id, related, legacyEndpointID),
      ]);
      const response = tree.dump();

      const [ancestors, nextAncestor] = ancestorResponse || [];
      const [totalEvents, events, nextEvent] = relatedResponse || [];
      const lifecycle = ancestors?.shift();

      const { total: totalChildren, next: nextChild } = response.pagination;
      return res.ok({
        body: Object.assign({}, response, lifecycle, {
          ancestors,
          events,
          pagination: {
            nextAncestor,
            nextChild,
            nextEvent,
            totalChildren,
            totalEvents,
          },
        }),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
