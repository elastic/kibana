/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import { API_ROUTE_WORKPAD } from '../../../common/lib/constants';
import { catchErrorHandler } from '../catch_error_handler';
import { shimWorkpad } from './shim_workpad';

export function initializeResolveWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: `${API_ROUTE_WORKPAD}/resolve/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const canvasContext = await context.canvas;
      const resolved = await canvasContext.workpad.resolve(request.params.id);
      const { saved_object: workpad } = resolved;

      shimWorkpad(workpad);

      return response.ok({
        body: {
          workpad: {
            id: workpad.id,
            ...workpad.attributes,
          },
          outcome: resolved.outcome,
          aliasId: resolved.alias_target_id,
          ...(resolved.alias_purpose !== undefined && {
            aliasPurpose: resolved.alias_purpose,
          }),
        },
      });
    })
  );
}
