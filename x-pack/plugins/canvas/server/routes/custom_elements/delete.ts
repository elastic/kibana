/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '..';
import { API_ROUTE_CUSTOM_ELEMENT, CUSTOM_ELEMENT_TYPE } from '../../../common/lib/constants';
import { catchErrorHandler } from '../catch_error_handler';
import { okResponse } from '../ok_response';

export function initializeDeleteCustomElementRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.versioned
    .delete({
      path: `${API_ROUTE_CUSTOM_ELEMENT}/{id}`,

      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
      },
      catchErrorHandler(async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        await soClient.delete(CUSTOM_ELEMENT_TYPE, request.params.id);
        return response.ok({ body: okResponse });
      })
    );
}
