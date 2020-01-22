/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import json from './sampledata.json';

export function registerAlertRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/endpoint/alerts',
      validate: false,
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        // const queryParams = await kibanaRequestToEndpointListQuery(req, endpointAppContext);
        // const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
        //   'search',
        //   queryParams
        // )) as SearchResponse<AlertData>;
        return res.ok({
          body: json,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}
