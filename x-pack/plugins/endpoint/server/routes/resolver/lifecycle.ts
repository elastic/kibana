/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { getAncestors } from './shared';

interface LifecycleQueryParams {
  ancestors: number;
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

interface LifecyclePathParams {
  id: string;
}

export const validateLifecycle = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    ancestors: schema.number({ defaultValue: 0, min: 0, max: 10 }),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleLifecycle(
  log: Logger
): RequestHandler<LifecyclePathParams, LifecycleQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { ancestors: levels, legacyEndpointID },
    } = req;
    try {
      const client = context.core.elasticsearch.dataClient;

      const [ancestors, next] = await getAncestors(client, levels + 1, id, legacyEndpointID);
      const root = ancestors.shift();

      return res.ok({
        body: Object.assign({ lifecycle: [] }, root, {
          ancestors,
          pagination: {
            next,
            ancestors: levels,
          },
        }),
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
