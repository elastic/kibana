/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

export function addRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/endpoint/hello-world',
      validate: false,
      options: {
        tags: ['access:resolver'],
      },
    },
    async function greetingIndex(_context, _request, response) {
      return response.ok({
        body: { hello: 'world' },
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  );
}
