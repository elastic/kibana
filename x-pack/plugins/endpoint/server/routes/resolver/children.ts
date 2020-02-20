/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger, IScopedClusterClient } from 'kibana/server';
import { extractEntityID } from './utils/normalize';
import { getPaginationParams, PaginationParams } from './utils/pagination';
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
  levels: number;
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
    levels: schema.number({ defaultValue: 0, min: 0, max: 3 }),
  }),
};

async function potentiallyKillKibana(
  client: IScopedClusterClient,
  id: string,
  legacyEndpointID: string | undefined,
  pagination: PaginationParams,
  levels: number
): Promise<any> {
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
  const lifecycleGroups = _.groupBy(lifecycleEvents, extractEntityID);
  const children = await Promise.all(
    Object.entries(lifecycleGroups).map(async ([entityID, group]) => {
      // Because this is recursive and in a map call, this is going to issue a maximum of
      // (2 * (m - 1)) ^ n queries where n is the level of children to display and m is the limit of
      // child processes to query per level. Each of these is going to be held in memory and reconstructed
      // so if we have large documents this is going to be slow and hog a ton of memory. Rather than designing
      // something like this that won't scale, we should change the UX to fit our data constraints that aren't
      // going anywhere anytime soon.
      if (levels > 0) {
        return {
          lifecycle: group,
          ...(await potentiallyKillKibana(
            client,
            entityID,
            legacyEndpointID,
            pagination,
            levels - 1
          )),
        };
      }
      return { lifecycle: group };
    })
  );

  return {
    children,
    pagination: {
      id,
      total,
      next: nextCursor,
    },
  };
}

export function handleChildren(
  log: Logger
): RequestHandler<ChildrenPathParams, ChildrenQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { limit, after, legacyEndpointID, levels },
    } = req;
    try {
      const pagination = getPaginationParams(limit, after);

      const client = context.core.elasticsearch.dataClient;

      const childrenResponse = await potentiallyKillKibana(
        client,
        id,
        legacyEndpointID,
        pagination,
        levels
      );

      childrenResponse.pagination.limit = limit;

      return res.ok({
        body: childrenResponse,
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
