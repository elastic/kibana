/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import { PROCESS_EVENTS_ROUTE, PROCESS_EVENTS_PER_PAGE } from '../../common/constants';

export const registerProcessEventsRoute = (router: IRouter) => {
  router.get(
    {
      path: PROCESS_EVENTS_ROUTE,
      validate: {
        query: schema.object({
          indexes: schema.maybe(schema.arrayOf(schema.string())),
          sessionEntityId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;

      const { indexes, sessionEntityId } = request.query;

      const search = await client.search({
        index: indexes,
        query: {
          match: {
            'process.entry.entity_id': sessionEntityId,
          },
        },
        size: PROCESS_EVENTS_PER_PAGE,
        sort: '@timestamp',
      });

      return response.ok({ body: search.body.hits });
    }
  );
};
