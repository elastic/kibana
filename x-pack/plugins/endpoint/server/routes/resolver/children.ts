/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { extractEntityID } from './utils/normalize';
import { getPaginationParams } from './utils/pagination';
import { LifecycleQuery } from './queries/lifecycle';
import { ChildrenQuery } from './queries/children';

interface ChildrenQueryParams {
  after?: string;
  limit: number;
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
    after: schema.maybe(schema.string()),
    limit: schema.number({ defaultValue: 10, min: 1, max: 100 }),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleChildren(
  log: Logger
): RequestHandler<ChildrenPathParams, ChildrenQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { limit, after, legacyEndpointID },
    } = req;
    try {
      const pagination = getPaginationParams(limit, after);

      const client = context.core.elasticsearch.dataClient;
      const childrenQuery = new ChildrenQuery(legacyEndpointID, pagination);
      const lifecycleQuery = new LifecycleQuery(legacyEndpointID);

      // Retrieve the related child process events for a given process
      const { total, results: events, nextCursor } = await childrenQuery.search(client, id);
      const childIDs = events.map(extractEntityID);

      // Retrieve the lifecycle events for the child processes (e.g. started, terminated etc)
      // this needs to fire after the above since we don't yet have the entity ids until we
      // run the first query
      const { results: lifecycleEvents } = await lifecycleQuery.search(client, ...childIDs);

      // group all of the lifecycle events by the child process id
      const lifecycleGroups = Object.values(_.groupBy(lifecycleEvents, extractEntityID));
      const children = lifecycleGroups.map(group => ({ lifecycle: group }));

      return res.ok({
        body: {
          children,
          pagination: {
            total,
            next: nextCursor,
            limit,
          },
        },
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
