/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';

import { TRANSFORM_ACTIONS } from '../../../../common/types/transform';
import type { ResponseStatus } from '../../../../common/api_schemas/common';
import type {
  ResetTransformsRequestSchema,
  ResetTransformsResponseSchema,
} from '../../../../common/api_schemas/reset_transforms';

import { isRequestTimeout, fillResultsWithTimeouts } from '../../utils/error_utils';

export async function resetTransforms(
  reqBody: ResetTransformsRequestSchema,
  ctx: RequestHandlerContext,
  response: KibanaResponseFactory
) {
  const { transformsInfo } = reqBody;

  const results: ResetTransformsResponseSchema = {};
  const esClient = (await ctx.core).elasticsearch.client;

  for (const transformInfo of transformsInfo) {
    const transformReset: ResponseStatus = { success: false };
    const transformId = transformInfo.id;

    try {
      try {
        await esClient.asCurrentUser.transform.resetTransform({
          transform_id: transformId,
        });
        transformReset.success = true;
      } catch (resetTransformJobError) {
        transformReset.error = resetTransformJobError.meta.body.error;
        if (resetTransformJobError.statusCode === 403) {
          return response.forbidden();
        }
      }

      results[transformId] = {
        transformReset,
      };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformInfo.id,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.RESET,
        });
      }
      results[transformId] = { transformReset: { success: false, error: e.meta.body.error } };
    }
  }
  return results;
}
