/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import { CUSTOM_ELEMENT_TYPE, API_ROUTE_CUSTOM_ELEMENT } from '../../../common/lib/constants';
import { okResponse } from '../ok_response';
import { catchErrorHandler } from '../catch_error_handler';

export function initializeDeleteCustomElementRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.delete(
    {
      path: `${API_ROUTE_CUSTOM_ELEMENT}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const soClient = (await context.core).savedObjects.client;
      await soClient.delete(CUSTOM_ELEMENT_TYPE, request.params.id);
      return response.ok({ body: okResponse });
    })
  );
}
