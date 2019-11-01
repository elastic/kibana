/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { endpoints2 } from './endpoints_stubs';

export function endpointsApi(router: IRouter) {
  router.get(
    {
      path: '/endpoints',
      validate: {},
    },
    function handleEndpoints(context, request, response) {
      const responseData = endpoints2;
      return response.ok({
        body: responseData,
      });
    }
  );
}
