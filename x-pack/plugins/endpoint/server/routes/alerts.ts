/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';

export function alertsRoutes(router: IRouter) {
  router.get(
    {
      path: '/alerts',
      validate: {
        query: schema.object({
          pageSize: schema.number(),
          pageIndex: schema.number(),
        }),
      },
    },
    async function(context, request, response) {
      let elasticsearchResponse;
      try {
        elasticsearchResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          {
            body: {
              from: request.query.pageIndex,
              size: request.query.pageSize,
              query: {
                match: {
                  'event.kind': 'alert',
                },
              },
            },
          }
        );
      } catch (error) {
        return response.internalError();
      }
      return response.ok({
        body: JSON.stringify({
          elasticsearchResponse,
        }),
      });
    }
  );
}
