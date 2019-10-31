/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export function setupEndpointDetailApi(router: IRouter, coreSetup: CoreSetup): void {
  router.get(
    {
      path: '/endpoints2/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async function handleGetEndpointDetail(context, request, response) {
      let responseBody;

      // DEVELOPMENT MODE (is removed during webpack build)
      // TODO: is this valid in Kibana runtime? Search of code base seems to suggest its OK
      if (process.env.NODE_ENV !== 'production') {
        const allEndpoints = (await import('./endpoint_dev_stubs')).endpoints2.hits.hits;

        responseBody = allEndpoints.find(endpoint => endpoint._id === request.params.id);
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
