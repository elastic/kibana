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
import { ResolverCursorPaginatedQueryParams, ResolverPathParams } from '../../../common/types';

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
): RequestHandler<ResolverPathParams, ResolverCursorPaginatedQueryParams> {
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
