/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import { RECENT_SESSION_ROUTE } from '../../common/constants';

export const registerRecentSessionRoute = (router: IRouter) => {
  router.get(
    {
      path: RECENT_SESSION_ROUTE,
      validate: {
        query: schema.object({
          indexes: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;

      const { indexes } = request.query;

      const search = await client.search({
        index: indexes,
        body: {
          query: {
            match: {
              'process.entry_leader.interactive': true,
            },
          },
          // This runtime_mappings is a temporary fix, so we are able to Query these ECS fields while they are not available
          // TODO: Remove the runtime_mappings once process.entry_leader.interactive is implemented to ECS
          runtime_mappings: {
            'process.entry_leader.interactive': {
              type: 'boolean',
            },
          },
          size: 1,
          sort: [{ '@timestamp': 'desc' }],
        },
      });

      return response.ok({ body: search.body.hits });
    }
  );
};
