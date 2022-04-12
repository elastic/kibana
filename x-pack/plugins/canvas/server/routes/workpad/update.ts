/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CanvasWorkpad } from '../../../types';
import { RouteInitializerDeps } from '../';
import {
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_STRUCTURES,
  API_ROUTE_WORKPAD_ASSETS,
} from '../../../common/lib/constants';
import { WorkpadSchema, WorkpadAssetSchema } from './workpad_schema';
import { okResponse } from '../ok_response';
import { catchErrorHandler } from '../catch_error_handler';

const AssetsRecordSchema = schema.recordOf(schema.string(), WorkpadAssetSchema);

export function initializeUpdateWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  // TODO: This route is likely deprecated and everything is using the workpad_structures
  // path instead. Investigate further.
  router.put(
    {
      path: `${API_ROUTE_WORKPAD}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: WorkpadSchema,
      },
      options: {
        body: {
          maxBytes: 26214400,
          accepts: ['application/json'],
        },
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const canvasContext = await context.canvas;
      await canvasContext.workpad.update(request.params.id, request.body as CanvasWorkpad);

      return response.ok({
        body: okResponse,
      });
    })
  );

  router.put(
    {
      path: `${API_ROUTE_WORKPAD_STRUCTURES}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: WorkpadSchema,
      },
      options: {
        body: {
          maxBytes: 26214400,
          accepts: ['application/json'],
        },
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const canvasContext = await context.canvas;
      await canvasContext.workpad.update(request.params.id, request.body as CanvasWorkpad);

      return response.ok({
        body: okResponse,
      });
    })
  );
}

export function initializeUpdateWorkpadAssetsRoute(deps: RouteInitializerDeps) {
  const { router } = deps;

  router.put(
    {
      path: `${API_ROUTE_WORKPAD_ASSETS}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        // ToDo: Currently the validation must be a schema.object
        // Because we don't know what keys the assets will have, we have to allow
        // unknowns and then validate in the handler
        body: schema.object({}, { unknowns: 'allow' }),
      },
      options: {
        body: {
          maxBytes: 26214400,
          accepts: ['application/json'],
        },
      },
    },
    async (context, request, response) => {
      const workpadAssets = {
        assets: AssetsRecordSchema.validate(request.body),
      };

      const canvasContext = await context.canvas;
      await canvasContext.workpad.update(request.params.id, workpadAssets as CanvasWorkpad);

      return response.ok({
        body: okResponse,
      });
    }
  );
}
