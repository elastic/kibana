/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteInitializerDeps } from '../';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
} from '../../../../../legacy/plugins/canvas/common/lib/constants';
import { CanvasWorkpad } from '../../../../../legacy/plugins/canvas/types';
import { getId } from '../../../../../legacy/plugins/canvas/public/lib/get_id';
import { WorkpadAttributes } from './workpad_attributes';
import { WorkpadSchema } from './workpad_schema';
import { okResponse } from '../ok_response';
import { catchErrorHandler } from '../catch_error_handler';

export function initializeCreateWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.post(
    {
      path: `${API_ROUTE_WORKPAD}`,
      validate: {
        body: WorkpadSchema,
      },
    },
    catchErrorHandler(async (context, request, response) => {
      if (!request.body) {
        return response.badRequest({ body: 'A workpad payload is required' });
      }

      const workpad = request.body as CanvasWorkpad;

      const now = new Date().toISOString();
      const { id, ...payload } = workpad;

      await context.core.savedObjects.client.create<WorkpadAttributes>(
        CANVAS_TYPE,
        {
          ...payload,
          '@timestamp': now,
          '@created': now,
        },
        { id: id || getId('workpad') }
      );

      return response.ok({
        body: okResponse,
      });
    })
  );
}
