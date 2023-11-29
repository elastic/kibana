/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';

import { TRANSFORM_ACTIONS } from '../../../../common/types/transform';
import { TRANSFORM_STATE } from '../../../../common/constants';
import type { ResponseStatus } from '../../../../common/api_schemas/common';
import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../../common/api_schemas/delete_transforms';

import { isRequestTimeout, fillResultsWithTimeouts } from '../../utils/error_utils';

async function getDataViewId(indexName: string, dataViewsService: DataViewsService) {
  const dv = (await dataViewsService.find(indexName)).find(({ title }) => title === indexName);
  return dv?.id;
}

async function deleteDestDataViewById(dataViewId: string, dataViewsService: DataViewsService) {
  return await dataViewsService.delete(dataViewId);
}

export async function deleteTransforms(
  reqBody: DeleteTransformsRequestSchema,
  ctx: RequestHandlerContext,
  response: KibanaResponseFactory,
  dataViewsService: DataViewsService
) {
  const { transformsInfo } = reqBody;

  // Cast possible undefineds as booleans
  const deleteDestIndex = !!reqBody.deleteDestIndex;
  const deleteDestDataView = !!reqBody.deleteDestDataView;
  const shouldForceDelete = !!reqBody.forceDelete;

  const results: DeleteTransformsResponseSchema = {};

  const coreContext = await ctx.core;
  const esClient = coreContext.elasticsearch.client;

  for (const transformInfo of transformsInfo) {
    let destinationIndex: string | undefined;

    const transformDeleted: ResponseStatus = { success: false };
    const destIndexDeleted: ResponseStatus = { success: false };
    const destDataViewDeleted: ResponseStatus = {
      success: false,
    };
    const transformId = transformInfo.id;
    // force delete only if the transform has failed
    let needToForceDelete = false;

    try {
      if (transformInfo.state === TRANSFORM_STATE.FAILED) {
        needToForceDelete = true;
      }
      if (!shouldForceDelete) {
        // Grab destination index info to delete
        try {
          const body = await esClient.asCurrentUser.transform.getTransform({
            transform_id: transformId,
          });
          const transformConfig = body.transforms[0];
          destinationIndex = transformConfig.dest.index;
        } catch (getTransformConfigError) {
          transformDeleted.error = getTransformConfigError.meta.body.error;
          results[transformId] = {
            transformDeleted,
            destIndexDeleted,
            destDataViewDeleted,
            destinationIndex,
          };
          // No need to perform further delete attempts
          continue;
        }
      }

      // Delete the data view if there's a data view that matches the name of dest index
      if (destinationIndex && deleteDestDataView) {
        try {
          const dataViewId = await getDataViewId(destinationIndex, dataViewsService);
          if (dataViewId) {
            await deleteDestDataViewById(dataViewId, dataViewsService);
            destDataViewDeleted.success = true;
          }
        } catch (deleteDestDataViewError) {
          destDataViewDeleted.error = deleteDestDataViewError.meta.body.error;
        }
      }

      try {
        await esClient.asCurrentUser.transform.deleteTransform({
          transform_id: transformId,
          force: shouldForceDelete && needToForceDelete,
          // @ts-expect-error ES type needs to be updated
          delete_dest_index: deleteDestIndex,
        });
        transformDeleted.success = true;
        destIndexDeleted.success = deleteDestIndex;
      } catch (deleteTransformJobError) {
        transformDeleted.error = deleteTransformJobError.meta.body.error;
        if (deleteTransformJobError.statusCode === 403) {
          return response.forbidden();
        }
      }

      results[transformId] = {
        transformDeleted,
        destIndexDeleted,
        destDataViewDeleted,
        destinationIndex,
      };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformInfo.id,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.DELETE,
        });
      }
      results[transformId] = { transformDeleted: { success: false, error: e.meta.body.error } };
    }
  }
  return results;
}
