/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { extractParentEntityID } from './utils/normalize';
import { LifecycleQuery } from './queries/lifecycle';
import {
  ResolverEvent,
  ResolverLifecycleQueryParams,
  ResolverPathParams,
} from '../../../common/types';

export const validateLifecycle = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    ancestors: schema.number({ defaultValue: 0, min: 0, max: 10 }),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

function getParentEntityID(results: ResolverEvent[]) {
  return results.length === 0 ? undefined : extractParentEntityID(results[0]);
}

export function handleLifecycle(
  log: Logger
): RequestHandler<ResolverPathParams, ResolverLifecycleQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { ancestors, legacyEndpointID },
    } = req;
    try {
      const ancestorLifecycles = [];
      const client = context.core.elasticsearch.dataClient;

      const lifecycleQuery = new LifecycleQuery(legacyEndpointID);
      const { results: processLifecycle } = await lifecycleQuery.search(client, id);
      let nextParentID = getParentEntityID(processLifecycle);

      if (nextParentID) {
        for (let i = 0; i < ancestors; i++) {
          const { results: lifecycle } = await lifecycleQuery.search(client, nextParentID);
          nextParentID = getParentEntityID(lifecycle);

          if (!nextParentID) {
            break;
          }

          ancestorLifecycles.push({
            lifecycle,
          });
        }
      }

      return res.ok({
        body: {
          lifecycle: processLifecycle,
          ancestors: ancestorLifecycles,
          pagination: {
            next: nextParentID || null,
            ancestors,
          },
        },
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
