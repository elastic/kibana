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

      const result = await client.get({
        index: PROCESS_EVENTS_INDEX,
        id,
      });

      return response.ok({
        body: {
          session_entry_leader: result?._source,
        },
      });
    }
  );
};
