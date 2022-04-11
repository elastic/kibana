/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from 'kibana/server';
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
    const isTransformExist = await esClient.transform.getTransform({
      transform_id: transform.transform_id,
      allow_no_match: false,
    });

    if (!isTransformExist) {
      await esClient.transform.putTransform(transform);
    }
  } catch (err) {
    const error = transformError(err);
    logger.error(`Failed to create transform ${transform.transform_id}`);
    logger.error(error.message);
  }
};
