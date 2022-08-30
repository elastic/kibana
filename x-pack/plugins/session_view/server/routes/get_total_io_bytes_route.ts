/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { EVENT_ACTION } from '@kbn/rule-data-utils';
import {
  GET_TOTAL_IO_BYTES_ROUTE,
  PROCESS_EVENTS_INDEX,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  TOTAL_BYTES_CAPTURED_PROPERTY,
} from '../../common/constants';

export const registerGetTotalIOBytesRoute = (router: IRouter) => {
  router.get(
    {
      path: GET_TOTAL_IO_BYTES_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
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
            size: 0,
            aggs: {
              total_bytes_captured: {
                sum: {
                  field: TOTAL_BYTES_CAPTURED_PROPERTY,
                },
              },
            },
          },
        });

        const agg: any = search.aggregations?.total_bytes_captured;

        return response.ok({ body: agg?.value || 0 });
      } catch (err) {
        // unauthorized
        if (err.meta.statusCode === 403) {
          return response.ok();
        }

        return response.badRequest(err.message);
      }
    }
  );
};
