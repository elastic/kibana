/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { generateSummaryTransformId } from './transform/generate_summary_transform_id';
import { generateHistoryTransformId } from './transform/generate_history_transform_id';

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
          { ignore: [409] }
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
    logger.error(`Cannot stop or delete entity transforms`);
    throw e;
  }
}
export async function stopAndDeleteSummaryTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const summaryTransformId = generateSummaryTransformId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.transform.stopTransform(
          { transform_id: summaryTransformId, wait_for_completion: true, force: true },
          { ignore: [409] }
        ),
      { logger }
    );
    await retryTransientEsErrors(
      () =>
        esClient.transform.deleteTransform(
          { transform_id: summaryTransformId, force: true },
          { ignore: [404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot stop or delete entity transforms`);
    throw e;
  }
}
