/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { TRANSFORM_ACTIONS } from '../../../../common/types/transform';
import { TRANSFORM_STATE } from '../../../../common/constants';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../../common/api_schemas/stop_transforms';

import { isRequestTimeout, fillResultsWithTimeouts } from '../../utils/error_utils';

export async function stopTransforms(
  transformsInfo: StopTransformsRequestSchema,
  esClient: ElasticsearchClient
) {
  const results: StopTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await esClient.transform.stopTransform({
        transform_id: transformId,
        force:
          transformInfo.state !== undefined
            ? transformInfo.state === TRANSFORM_STATE.FAILED
            : false,
        wait_for_completion: true,
      });
      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.STOP,
        });
      }
      results[transformId] = { success: false, error: e.meta.body.error };
    }
  }
  return results;
}
