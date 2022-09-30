/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export const createAndStartTransform = ({
  esClient,
  transform,
  logger,
}: {
  esClient: ElasticsearchClient;
  transform: TransformPutTransformRequest;
  logger: Logger;
}) =>
  createTransformIfNotExists(esClient, transform, logger).then((result) => {
    if (result[transform.transform_id].success) {
      return startTransformIfNotStarted(esClient, transform.transform_id, logger);
    } else {
      return result;
    }
  });

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

    logger.error(`Transform ${transform.transform_id} already exists`);
    return {
      [transform.transform_id]: {
        success: false,
        error: transformError(new Error(`Transform ${transform.transform_id} already exists`)),
      },
    };
  } catch (existErr) {
    const existError = transformError(existErr);
    if (existError.statusCode === 404) {
      try {
        await esClient.transform.putTransform(transform);

        return { [transform.transform_id]: { success: true, error: null } };
      } catch (createErr) {
        const createError = transformError(createErr);
        logger.error(
          `Failed to create transform ${transform.transform_id}: ${createError.message}`
        );
        return { [transform.transform_id]: { success: false, error: createError } };
      }
    } else {
      logger.error(
        `Failed to check if transform ${transform.transform_id} exists before creation: ${existError.message}`
      );
      return { [transform.transform_id]: { success: false, error: existError } };
    }
  }
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

      return {
        [transformId]: {
          success: false,
          error: transformError(
            new Error(`Failed starting transform ${transformId}: couldn't find transform`)
          ),
        },
      };
    }

    const fetchedTransformStats = transformStats.transforms[0];
    if (fetchedTransformStats.state === 'stopped') {
      try {
        return await esClient.transform.startTransform({ transform_id: transformId });
      } catch (startErr) {
        const startError = transformError(startErr);

        logger.error(`Failed starting transform ${transformId}: ${startError.message}`);
        return {
          [transformId]: {
            success: false,
            error: startError,
          },
        };
      }
    } else if (
      fetchedTransformStats.state === 'stopping' ||
      fetchedTransformStats.state === 'aborting' ||
      fetchedTransformStats.state === 'failed'
    ) {
      logger.error(
        `Not starting transform ${transformId} since it's state is: ${fetchedTransformStats.state}`
      );
      return {
        [transformId]: {
          success: false,
          error: transformError(
            new Error(
              `Not starting transform ${transformId} since it's state is: ${fetchedTransformStats.state}`
            )
          ),
        },
      };
    }
  } catch (statsErr) {
    const statsError = transformError(statsErr);

    logger.error(`Failed to check if transform ${transformId} is started: ${statsError.message}`);
    return {
      [transformId]: {
        success: false,
        error: statsErr,
      },
    };
  }
};
