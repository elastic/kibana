/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { EVENT_ACTION, TIMESTAMP } from '@kbn/rule-data-utils';
import {
  GET_TOTAL_IO_BYTES_ROUTE,
  PROCESS_EVENTS_INDEX,
  TOTAL_BYTES_CAPTURED_PROPERTY,
  TTY_CHAR_DEVICE_MAJOR_PROPERTY,
  TTY_CHAR_DEVICE_MINOR_PROPERTY,
  HOST_ID_PROPERTY,
} from '../../common/constants';
import { getTTYQueryPredicates } from './io_events_route';

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
        const ttyPredicates = await getTTYQueryPredicates(client, sessionEntityId);

        if (!ttyPredicates) {
          return response.ok({ body: { total: 0 } });
        }

        const search = await client.search({
          index: [PROCESS_EVENTS_INDEX],
          body: {
            query: {
              bool: {
                must: [
                  { term: { [TTY_CHAR_DEVICE_MAJOR_PROPERTY]: ttyPredicates.ttyMajor } },
                  { term: { [TTY_CHAR_DEVICE_MINOR_PROPERTY]: ttyPredicates.ttyMinor } },
                  { term: { [HOST_ID_PROPERTY]: ttyPredicates.hostId } },
                  { term: { [EVENT_ACTION]: 'text_output' } },
                  {
                    range: {
                      [TIMESTAMP]: {
                        gte: ttyPredicates.range[0],
                        lte: ttyPredicates.range[1],
                      },
                    },
                  },
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

        return response.ok({ body: { total: agg?.value || 0 } });
      } catch (err) {
        // unauthorized
        if (err?.meta?.statusCode === 403) {
          return response.ok({ body: { total: 0 } });
        }

        return response.badRequest(err.message);
      }
    }
  );
};
