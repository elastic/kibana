/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import { PROCESS_EVENTS_ROUTE, PROCESS_EVENTS_PER_PAGE } from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';

export const registerProcessEventsRoute = (router: IRouter) => {
  router.get(
    {
      path: PROCESS_EVENTS_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;

      const { sessionEntityId } = request.query;

      const search = await client.search({
        index: ['cmd'],
        body: {
          query: {
            match: {
              'process.entry.entity_id': sessionEntityId,
            },
          },
          size: PROCESS_EVENTS_PER_PAGE,
          sort: [{ '@timestamp': 'asc' }],
        }
      });

      // temporary approach. ideally we'd pull from both these indexes above, but unfortunately
      // our new fields like process.entry.entity_id won't have a mapping in the .siem-signals index
      // this should hopefully change once we update ECS or endpoint-package..
      // for demo purpose we just load all alerts, and stich it together on the frontend.
      const alerts = await client.search({
        index: ['.siem-signals-default'],
        body: {
          size: PROCESS_EVENTS_PER_PAGE,
          sort: [{ '@timestamp': 'asc' }],
        }
      });

      alerts.body.hits.hits = alerts.body.hits.hits.map((hit: any) => {
        hit._source = expandDottedObject(hit._source);

        return hit;
      });

      return response.ok({
        body: {
          events: search.body.hits,
          alerts: alerts.body.hits,
        },
      });
    }
  );
};
