/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';
import { schema } from '@kbn/config-schema';

export function registerEnginesRoute({ router, config }) {
  router.get(
    {
      path: '/api/appsearch/engines',
      validate: {
        query: schema.object({
          type: schema.string(),
          pageIndex: schema.number(),
        }),
      },
    },
    async (context, request, response) => {
      const appSearchUrl = config.host;
      const { type, pageIndex } = request.query;

      const url = `${appSearchUrl}/as/engines/collection?type=${type}&page[current]=${pageIndex}&page[size]=10`;
      const enginesResponse = await fetch(url, {
        headers: { Authorization: request.headers.authorization },
      });

      if (enginesResponse.url.endsWith('/login')) {
        return response.custom({
          statusCode: 200,
          body: { message: 'no-as-account' },
          headers: { 'content-type': 'application/json' },
        });
      }

      const engines = await enginesResponse.json();
      return response.ok({
        body: engines,
        headers: { 'content-type': 'application/json' },
      });
    }
  );
}
