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
          sortField: schema.maybe(schema.string()),
          sortDirection: schema.maybe(schema.string()),
        }),
      },
    },
    handleAlerts
  );

  router.get(
    {
      path: '/alerts/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    handleAlertDetails
  );

  router.post(
    {
      path: '/alerts/archive',
      validate: {
        query: schema.object({
          alerts: schema.string(),
        }),
      },
    },
    handleArchive
  );
}

async function handleArchive(context, request, response) {
  // TODO: archive the alert
  return response.ok({
    body: JSON.stringify(request.query),
  });
}

async function handleAlertDetails(context, request, response) {
  let elasticsearchResponse;
  try {
    elasticsearchResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
      'search',
      {
        body: {
          query: {
            bool: {
              must: [
                {
                  match: {
                    'event.kind': 'alert',
                  },
                },
                {
                  match: {
                    _id: request.params.id,
                  },
                },
              ],
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

async function handleAlerts(context, request, response) {
  let elasticsearchResponse;
  try {
    function sortParams() {
      if (request.query.sortField && request.query.sortDirection) {
        return [
          {
            [request.query.sortField]: { order: request.query.sortDirection },
          },
        ];
      } else {
        return [];
      }
    }

    elasticsearchResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
      'search',
      {
        body: {
          from: request.query.pageIndex * request.query.pageSize,
          size: request.query.pageSize,
          sort: sortParams(),
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
