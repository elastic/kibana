/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateTransformId } from './transform/generate_transform_id';
import { retryTransientEsErrors } from './helpers/retry';

export async function stopAndDeleteTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  const transformId = generateTransformId(definition);
  try {
    await retryTransientEsErrors(
      async () => {
        await esClient.transform.stopTransform(
          { transform_id: transformId, wait_for_completion: true, force: true },
          { ignore: [409] }
        );
        await esClient.transform.deleteTransform(
          { transform_id: transformId, force: true },
          { ignore: [404] }
        );
      },
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot stop or delete entity transform [${transformId}]`);
    throw e;
  }
}
