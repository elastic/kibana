/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import { CUSTOM_ELEMENT_TYPE, API_ROUTE_CUSTOM_ELEMENT } from '../../../common/lib/constants';
import { CustomElementAttributes } from './custom_element_attributes';
import { catchErrorHandler } from '../catch_error_handler';

export function initializeGetCustomElementRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: `${API_ROUTE_CUSTOM_ELEMENT}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const customElement = await context.core.savedObjects.client.get<CustomElementAttributes>(
        CUSTOM_ELEMENT_TYPE,
        request.params.id
      );

      return response.ok({
        body: {
          id: customElement.id,
          ...customElement.attributes,
        },
      });
    })
  );
}
