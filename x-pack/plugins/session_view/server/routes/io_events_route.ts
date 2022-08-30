/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { EVENT_ACTION } from '@kbn/rule-data-utils';
import {
  IO_EVENTS_ROUTE,
  IO_EVENTS_PER_PAGE,
  PROCESS_EVENTS_INDEX,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
} from '../../common/constants';

export const registerIOEventsRoute = (router: IRouter) => {
  router.get(
    {
      path: IO_EVENTS_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.string(),
          cursor: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { cursor } = request.query;
      const { sessionEntityId } = request.query;

      try {
        const search = await client.search({
          index: [PROCESS_EVENTS_INDEX],
          body: {
            query: {
              bool: {
                must: [
                  { term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } },
                  { term: { [EVENT_ACTION]: 'text_output' } },
                ],
              },
            },
            size: IO_EVENTS_PER_PAGE,
            sort: [{ '@timestamp': 'asc' }],
            search_after: cursor ? [cursor] : undefined,
          },
        });

        const events = search.hits.hits;
        const total =
          typeof search.hits.total === 'number' ? search.hits.total : search.hits.total?.value;

        return response.ok({ body: { total, events } });
      } catch (err) {
        // unauthorized
        if (err.meta.statusCode === 403) {
          return response.ok({ body: { total: 0, events: [] } });
        }

        return response.badRequest(err.message);
      }
    }
  );
};
