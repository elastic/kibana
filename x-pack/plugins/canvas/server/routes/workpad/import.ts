/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitializerDeps } from '..';
import { API_ROUTE_WORKPAD_IMPORT } from '../../../common/lib/constants';
import { ImportedCanvasWorkpad } from '../../../types';
import { ImportedWorkpadSchema } from './workpad_schema';
import { okResponse } from '../ok_response';
import { catchErrorHandler } from '../catch_error_handler';

const createRequestBodySchema = ImportedWorkpadSchema;

export function initializeImportWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.post(
    {
      path: `${API_ROUTE_WORKPAD_IMPORT}`,
      validate: {
        body: createRequestBodySchema,
      },
      options: {
        body: {
          maxBytes: 26214400,
          accepts: ['application/json'],
        },
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const workpad = request.body as ImportedCanvasWorkpad;

      const createdObject = await context.canvas.workpad.import(workpad);

      return response.ok({
        body: { ...okResponse, id: createdObject.id },
      });
    })
  );
}
