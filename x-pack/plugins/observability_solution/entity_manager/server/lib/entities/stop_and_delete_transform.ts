/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import {
  generateHistoryTransformId,
  generateLatestTransformId,
} from './helpers/generate_component_id';
import { retryTransientEsErrors } from './helpers/retry';

export async function stopAndDeleteHistoryTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const historyTransformId = generateHistoryTransformId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.transform.stopTransform(
          { transform_id: historyTransformId, wait_for_completion: true, force: true },
          { ignore: [409, 404] }
        ),
      { logger }
    );
    await retryTransientEsErrors(
      () =>
        esClient.transform.deleteTransform(
          { transform_id: historyTransformId, force: true },
          { ignore: [404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot stop or delete history transform [${definition.id}]`);
    throw e;
  }
}

export async function stopAndDeleteLatestTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const latestTransformId = generateLatestTransformId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.transform.stopTransform(
          { transform_id: latestTransformId, wait_for_completion: true, force: true },
          { ignore: [409, 404] }
        ),
      { logger }
    );
    await retryTransientEsErrors(
      () =>
        esClient.transform.deleteTransform(
          { transform_id: latestTransformId, force: true },
          { ignore: [404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot stop or delete latest transform [${definition.id}]`);
    throw e;
  }
}
