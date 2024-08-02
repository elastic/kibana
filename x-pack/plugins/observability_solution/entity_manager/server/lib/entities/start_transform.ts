/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import {
  generateHistoryBackfillTransformId,
  generateHistoryTransformId,
  generateLatestTransformId,
} from './helpers/generate_component_id';
import { retryTransientEsErrors } from './helpers/retry';
import { isBackfillEnabled } from './helpers/is_backfill_enabled';

export async function startTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const historyTransformId = generateHistoryTransformId(definition);
    const latestTransformId = generateLatestTransformId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.transform.startTransform({ transform_id: historyTransformId }, { ignore: [409] }),
      { logger }
    );
    if (isBackfillEnabled(definition)) {
      const historyBackfillTransformId = generateHistoryBackfillTransformId(definition);
      await retryTransientEsErrors(
        () =>
          esClient.transform.startTransform(
            { transform_id: historyBackfillTransformId },
            { ignore: [409] }
          ),
        { logger }
      );
    }
    await retryTransientEsErrors(
      () =>
        esClient.transform.startTransform({ transform_id: latestTransformId }, { ignore: [409] }),
      { logger }
    );
  } catch (err) {
    logger.error(`Cannot start entity transforms [${definition.id}]: ${err}`);
    throw err;
  }
}
