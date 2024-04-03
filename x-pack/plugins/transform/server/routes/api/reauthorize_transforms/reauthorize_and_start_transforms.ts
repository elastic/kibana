/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { TransportRequestOptions } from '@elastic/elasticsearch';

import { TRANSFORM_ACTIONS } from '../../../../common/types/transform';
import type {
  ReauthorizeTransformsRequestSchema,
  ReauthorizeTransformsResponseSchema,
} from '../../../../common/api_schemas/reauthorize_transforms';

import { isRequestTimeout, fillResultsWithTimeouts } from '../../utils/error_utils';

export async function reauthorizeAndStartTransforms(
  transformsInfo: ReauthorizeTransformsRequestSchema,
  esClient: ElasticsearchClient,
  options?: TransportRequestOptions
) {
  const results: ReauthorizeTransformsResponseSchema = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await esClient.transform.updateTransform(
        {
          body: {},
          transform_id: transformId,
        },
        options ?? {}
      );

      await esClient.transform.startTransform(
        {
          transform_id: transformId,
        },
        { ignore: [409] }
      );

      results[transformId] = { success: true };
    } catch (e) {
      if (isRequestTimeout(e)) {
        return fillResultsWithTimeouts({
          results,
          id: transformId,
          items: transformsInfo,
          action: TRANSFORM_ACTIONS.REAUTHORIZE,
        });
      }
      results[transformId] = { success: false, error: e.meta.body.error };
    }
  }
  return results;
}
