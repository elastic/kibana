/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { omit } from 'lodash';
import { KibanaResponseFactory } from 'src/core/server';
import { SavedObjectsClientContract } from 'src/core/server';
import { RouteInitializerDeps } from '../';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
  API_ROUTE_WORKPAD_STRUCTURES,
  API_ROUTE_WORKPAD_ASSETS,
} from '../../../../../legacy/plugins/canvas/common/lib/constants';
import { WorkpadAttributes } from './workpad_attributes';
import { WorkpadSchema, WorkpadAssetSchema } from './workpad_schema';
import { okResponse } from '../ok_response';
import { catchErrorHandler } from '../catch_error_handler';

const AssetsRecordSchema = schema.recordOf(schema.string(), WorkpadAssetSchema);

const AssetPayloadSchema = schema.object({
  assets: AssetsRecordSchema,
});

const workpadUpdateHandler = async (
  payload: TypeOf<typeof WorkpadSchema> | TypeOf<typeof AssetPayloadSchema>,
  id: string,
  savedObjectsClient: SavedObjectsClientContract,
  response: KibanaResponseFactory
) => {
  const now = new Date().toISOString();

  const workpadObject = await savedObjectsClient.get<WorkpadAttributes>(CANVAS_TYPE, id);
  await savedObjectsClient.create<WorkpadAttributes>(
    CANVAS_TYPE,
    {
      ...workpadObject.attributes,
      ...omit(payload, 'id'), // never write the id property
      '@timestamp': now, // always update the modified time
      '@created': workpadObject.attributes['@created'], // ensure created is not modified
    },
    { overwrite: true, id }
  );

  return response.ok({
    body: okResponse,
  });
};

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
    },
    catchErrorHandler(async (context, request, response) => {
      return workpadUpdateHandler(
        request.body,
        request.params.id,
        context.core.savedObjects.client,
        response
      );
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
    },
    catchErrorHandler(async (context, request, response) => {
      return workpadUpdateHandler(
        request.body,
        request.params.id,
        context.core.savedObjects.client,
        response
      );
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
        body: schema.object({}, { allowUnknowns: true }),
      },
    },
    async (context, request, response) => {
      return workpadUpdateHandler(
        { assets: AssetsRecordSchema.validate(request.body) },
        request.params.id,
        context.core.savedObjects.client,
        response
      );
    }
  );
}
