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
      path: '/endpoints/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async function handleGetEndpoints(context, request, response) {
      const responseBody = {
        id: request.params.id,
      };
      return response.ok({
        body: responseBody,
      });
    }
  );
}
