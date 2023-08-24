/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  TransformGetTransformResponse,
  TransformStartTransformResponse,
  TransformPutTransformResponse,
  TransformGetTransformTransformSummary,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import {
  getRiskScorePivotTransformId,
  getRiskScoreLatestTransformId,
} from '../../../../common/utils/risk_score_modules';

export const getLegacyTransforms = async ({
  namespace,
  esClient,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
}) => {
  const getTransformStatsRequests: Array<Promise<TransformGetTransformResponse>> = [];
  [RiskScoreEntity.host, RiskScoreEntity.user].forEach((entity) => {
    getTransformStatsRequests.push(
      esClient.transform.getTransform({
        transform_id: getRiskScorePivotTransformId(entity, namespace),
      })
    );
    getTransformStatsRequests.push(
      esClient.transform.getTransform({
        transform_id: getRiskScoreLatestTransformId(entity, namespace),
      })
    );
  });

  const results = await Promise.allSettled(getTransformStatsRequests);

  const transforms = results.reduce((acc, result) => {
    if (result.status === 'fulfilled' && result.value?.transforms?.length > 0) {
      acc.push(...result.value.transforms);
    }
    return acc;
  }, [] as TransformGetTransformTransformSummary[]);

  return transforms;
};

export const removeLegacyTransforms = async ({
  namespace,
  esClient,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
}): Promise<void> => {
  const transforms = await getLegacyTransforms({ namespace, esClient });

  const stopTransformRequests = transforms.map((t) =>
    esClient.transform.deleteTransform({
      transform_id: t.id,
      force: true,
    })
  );

  await Promise.allSettled(stopTransformRequests);
};

export const createTransform = async ({
  esClient,
  transform,
  logger,
}: {
  esClient: ElasticsearchClient;
  transform: TransformPutTransformRequest;
  logger: Logger;
}): Promise<TransformPutTransformResponse | void> => {
  try {
    await esClient.transform.getTransform({
      transform_id: transform.transform_id,
    });

    logger.info(`Transform ${transform.transform_id} already exists`);
  } catch (existErr) {
    const transformedError = transformError(existErr);
    if (transformedError.statusCode === 404) {
      return esClient.transform.putTransform(transform);
    } else {
      logger.error(
        `Failed to check if transform ${transform.transform_id} exists before creation: ${transformedError.message}`
      );
      throw existErr;
    }
  }
};

export const startTransform = async ({
  esClient,
  transformId,
}: {
  esClient: ElasticsearchClient;
  transformId: string;
}): Promise<TransformStartTransformResponse | void> => {
  const transformStats = await esClient.transform.getTransformStats({
    transform_id: transformId,
  });
  if (transformStats.count <= 0) {
    throw new Error(`Can't check ${transformId} status`);
  }
  if (
    transformStats.transforms[0].state === 'indexing' ||
    transformStats.transforms[0].state === 'started'
  ) {
    return;
  }
  return esClient.transform.startTransform({ transform_id: transformId });
};
