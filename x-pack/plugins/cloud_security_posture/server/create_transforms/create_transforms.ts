/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { latestFindingsTransform } from './latest_findings_transform';

// TODO: Move transforms to integration package
export const initializeCspTransforms = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  // Deletes old assets from previous versions as part of upgrade process
  const LATEST_TRANSFORM_V830 = 'cloud_security_posture.findings_latest-default-0.0.1';
  await deleteTransformSafe(esClient, logger, LATEST_TRANSFORM_V830);
  await initializeTransform(esClient, latestFindingsTransform, logger);
};

export const initializeTransform = async (
  esClient: ElasticsearchClient,
  transform: TransformPutTransformRequest,
  logger: Logger
) => {
  const success = await createTransformIfNotExists(esClient, transform, logger);

  if (success) {
    await startTransformIfNotStarted(esClient, transform.transform_id, logger);
  }
};

/**
 * Checks if a transform exists, And if not creates it
 *
 * @param transform - the transform to create. If a transform with the same transform_id already exists, nothing is created or updated.
 *
 * @return true if the transform exits or created, false otherwise.
 */
export const createTransformIfNotExists = async (
  esClient: ElasticsearchClient,
  transform: TransformPutTransformRequest,
  logger: Logger
) => {
  try {
    await esClient.transform.getTransform({
      transform_id: transform.transform_id,
    });
    return true;
  } catch (existErr) {
    const existError = transformError(existErr);
    if (existError.statusCode === 404) {
      try {
        await esClient.transform.putTransform(transform);
        return true;
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
  return false;
};

export const startTransformIfNotStarted = async (
  esClient: ElasticsearchClient,
  transformId: string,
  logger: Logger
) => {
  try {
    const transformStats = await esClient.transform.getTransformStats({
      transform_id: transformId,
    });
    if (transformStats.count <= 0) {
      logger.error(`Failed starting transform ${transformId}: couldn't find transform`);
      return;
    }
    const fetchedTransformStats = transformStats.transforms[0];
    if (fetchedTransformStats.state === 'stopped') {
      try {
        return await esClient.transform.startTransform({ transform_id: transformId });
      } catch (startErr) {
        const startError = transformError(startErr);
        logger.error(`Failed starting transform ${transformId}: ${startError.message}`);
      }
    } else if (
      fetchedTransformStats.state === 'stopping' ||
      fetchedTransformStats.state === 'aborting' ||
      fetchedTransformStats.state === 'failed'
    ) {
      logger.error(
        `Not starting transform ${transformId} since it's state is: ${fetchedTransformStats.state}`
      );
    }
  } catch (statsErr) {
    const statsError = transformError(statsErr);
    logger.error(`Failed to check if transform ${transformId} is started: ${statsError.message}`);
  }
};

const deleteTransformSafe = async (esClient: ElasticsearchClient, logger: Logger, name: string) => {
  try {
    await esClient.transform.deleteTransform({ transform_id: name, force: true });
    logger.info(`Deleted transform successfully [Name: ${name}]`);
  } catch (e) {
    if (e instanceof errors.ResponseError && e.statusCode === 404) {
      logger.trace(`Transform no longer exists [Name: ${name}]`);
    } else {
      logger.error(`Failed to delete transform [Name: ${name}]`);
      logger.error(e);
    }
  }
};
