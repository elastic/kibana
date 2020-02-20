/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { RequestHandler, Logger } from 'kibana/server';
import { getPaginationParams } from './utils/pagination';
import { RelatedAlertsQuery } from './queries/related_alerts';

interface RelatedAlertsQueryParams {
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

interface RelatedAlertsPathParams {
  id: string;
}

export const validateRelatedAlerts = {
  params: schema.object({ id: schema.string() }),
  query: schema.object({
    after: schema.maybe(schema.string()),
    limit: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
    legacyEndpointID: schema.maybe(schema.string()),
  }),
};

export function handleRelatedAlerts(
  log: Logger
): RequestHandler<RelatedAlertsPathParams, RelatedAlertsQueryParams> {
  return async (context, req, res) => {
    const {
      params: { id },
      query: { limit, after, legacyEndpointID },
    } = req;
    try {
      const pagination = getPaginationParams(limit, after);

      const client = context.core.elasticsearch.dataClient;
      // Retrieve the related alerts for a given process
      const relatedAlertsQuery = new RelatedAlertsQuery(legacyEndpointID, pagination);
      const relatedAlerts = await relatedAlertsQuery.search(client, id);

      const { total, results: alerts, nextCursor } = relatedAlerts;

      return res.ok({
        body: {
          alerts,
          pagination: { total, next: nextCursor, limit },
        },
      });
    } catch (err) {
      log.warn(err);
      return res.internalError({ body: err });
    }
  };
}
