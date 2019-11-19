/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
} from '../../../../../legacy/plugins/canvas/common/lib/constants';
import { okResponse } from './ok_response';

export function initializeDeleteWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.delete(
    {
      path: `${API_ROUTE_WORKPAD}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        context.core.savedObjects.client.delete(CANVAS_TYPE, request.params.id);
        return response.ok({ body: okResponse });
      } catch (error) {
        if (error.isBoom) {
          return response.customError({
            body: error.output.payload,
            statusCode: error.output.statusCode,
          });
        }
        return response.badRequest({ body: error });
      }
    }
  );
}
