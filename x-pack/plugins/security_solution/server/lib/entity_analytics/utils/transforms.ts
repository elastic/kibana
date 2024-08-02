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
  TransformGetTransformStatsTransformStats,
} from '@elastic/elasticsearch/lib/api/types';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../common/entity_analytics/risk_engine';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import {
  getRiskScorePivotTransformId,
  getRiskScoreLatestTransformId,
} from '../../../../common/utils/risk_score_modules';
import type { TransformOptions } from '../risk_score/configurations';
import { getTransformOptions } from '../risk_score/configurations';

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

export const getLatestTransformId = (namespace: string): string =>
  `risk_score_latest_transform_${namespace}`;

const hasTransformStarted = (transformStats: TransformGetTransformStatsTransformStats): boolean => {
  return transformStats.state === 'indexing' || transformStats.state === 'started';
};

export const scheduleTransformNow = async ({
  esClient,
  transformId,
}: {
  esClient: ElasticsearchClient;
  transformId: string;
}): Promise<void> => {
  const transformStats = await esClient.transform.getTransformStats({
    transform_id: transformId,
  });
  if (transformStats.count <= 0) {
    throw new Error(
      `Unable to find transform status for [${transformId}] while attempting to schedule`
    );
  }

  if (!hasTransformStarted(transformStats.transforms[0])) {
    await esClient.transform.startTransform({
      transform_id: transformId,
    });
  } else {
    await esClient.transform.scheduleNowTransform({
      transform_id: transformId,
    });
  }
};

/**
 * Whenever we change the latest transform configuration, we must ensure we update the transform in environments where it has already been installed.
 */
const upgradeLatestTransformIfNeeded = async ({
  esClient,
  namespace,
  logger,
}: {
  esClient: ElasticsearchClient;
  namespace: string;
  logger: Logger;
}): Promise<TransformStartTransformResponse | void> => {
  const transformId = getLatestTransformId(namespace);
  const latestIndex = getRiskScoreLatestIndex(namespace);
  const timeSeriesIndex = getRiskScoreTimeSeriesIndex(namespace);

  const response = await esClient.transform.getTransform({
    transform_id: transformId,
  });

  const newConfig = getTransformOptions({
    dest: latestIndex,
    source: [timeSeriesIndex],
  });

  if (isTransformOutdated(response.transforms[0], newConfig)) {
    logger.info(`Upgrading transform ${transformId}`);

    const { latest: _unused, ...changes } = newConfig;

    await esClient.transform.updateTransform({
      transform_id: transformId,
      ...changes,
    });
  }
};

export const scheduleLatestTransformNow = async ({
  namespace,
  esClient,
  logger,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const transformId = getLatestTransformId(namespace);

  try {
    await upgradeLatestTransformIfNeeded({ esClient, namespace, logger });
  } catch (err) {
    logger.error(
      `There was an error upgrading the transform ${transformId}. Continuing with transform scheduling. ${err.message}`
    );
  }

  await scheduleTransformNow({ esClient, transformId });
};

/**
 * Whitelist the transform fields that we can update.
 */

const isTransformOutdated = (
  transform: TransformGetTransformTransformSummary,
  newConfig: TransformOptions
): boolean => transform._meta?.version !== newConfig._meta?.version;
