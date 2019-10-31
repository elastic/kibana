/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IRouter } from 'kibana/server';

// TODO: implement pagination?

export function setupEndpointListApi(router: IRouter, coreSetup: CoreSetup): void {
  router.get(
    {
      path: '/endpoints',
      validate: {},
    },
    async function handleGetEndpointsList(context, request, response) {
      let responseBody;

      // DEVELOPMENT MODE (is removed during webpack build)
      if (process.env.NODE_ENV !== 'production') {
        // TODO: is this valid in Kibana runtime? Search of code base seems to suggest its OK
        responseBody = (await import('./endpoint_dev_stubs2')).endpoints;
      } else {
        return response.customError({
          body: 'This API is not implemented yet.',
          statusCode: 501,
        });
      }

      return response.ok({
        body: responseBody,
      });
    }
  );

  router.get(
    {
      path: '/endpoints2',
      validate: {},
    },
    async function handleGetEndpointsList(context, request, response) {
      let responseBody;

      // DEVELOPMENT MODE (is removed during webpack build)
      // TODO: is this valid in Kibana runtime? Search of code base seems to suggest its OK
      if (process.env.NODE_ENV !== 'production') {
        responseBody = (await import('./endpoint_dev_stubs')).endpoints2;
      } else {
        return response.customError({
          body: 'This API is not implemented yet.',
          statusCode: 501,
        });
      }

      return response.ok({
        body: responseBody,
      });
    }
  );
}
