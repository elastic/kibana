/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { latestFindingsTransform } from './latest_findings_transform';
import { benchmarkScoreTransform } from './benchmark_score_transform';

// TODO: Move transforms to integration package
export const initializeCspTransforms = async (esClient: ElasticsearchClient, logger: Logger) => {
  createTransformIfNotExists(esClient, latestFindingsTransform, logger);
  createTransformIfNotExists(esClient, benchmarkScoreTransform, logger);
};

export const createTransformIfNotExists = async (
  esClient: ElasticsearchClient,
  transform: TransformPutTransformRequest,
  logger: Logger
) => {
  try {
    await esClient.transform.getTransform({
      transform_id: transform.transform_id,
      allow_no_match: true,
    });
  } catch (existErr) {
    const existError = transformError(existErr);
    if (existError.statusCode === 404) {
      try {
        await esClient.transform.putTransform(transform);
      } catch (createErr) {
        const createError = transformError(createErr);
        logger.error(
          `Failed to create transform ${transform.transform_id}: ${createError.message}`
        );
      }
    } else {
      logger.error(
        `Failed to check if transform ${transform.transform_id} exists: ${existError.message}`
      );
    }
  }
};
