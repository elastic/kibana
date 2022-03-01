/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import { SESSION_ENTRY_LEADERS_ROUTE, PROCESS_EVENTS_INDEX } from '../../common/constants';

export const sessionEntryLeadersRoute = (router: IRouter) => {
  router.get(
    {
      path: SESSION_ENTRY_LEADERS_ROUTE,
      validate: {
        query: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;
      const { id } = request.query;
      try {
        const result = await client.search({
          index: PROCESS_EVENTS_INDEX,
          body: {
            // only return 1 match at most
            size: 1,
            query: {
              bool: {
                filter: [
                  {
                    // only return documents with the matching _id
                    ids: {
                      values: id,
                    },
                  },
                ],
              },
            },
          },
        });
        const docs = result.hits.hits;
        if (docs.length > 0) {
          return response.ok({
            body: {
              session_entry_leader: docs[0]._source,
            },
          });
        } else {
          return response.notFound();
        }
      } catch (error) {
        console.log(error.toString());
        debugger;
        return response.customError({ statusCode: 501, body: { message: 'bullshit' } });
      }
    }
  );
};
