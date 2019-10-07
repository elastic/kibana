/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IRouter } from 'kibana/server';

export function setupEndpointsApi(router: IRouter, coreSetup: CoreSetup): void {
  router.get(
    {
      path: '/endpoints',
      validate: false,
    },
    async function handleGetEndpoints(context, request, response) {
      return response.ok({
        body: Array.from({ length: 20 }, (y, x) => ({ name: `endpoint ${x}`, id: x })),
      });
    }
  );
}
