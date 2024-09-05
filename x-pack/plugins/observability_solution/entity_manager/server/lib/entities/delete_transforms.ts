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
  generateHistoryBackfillTransformId,
  generateLatestTransformId,
} from './helpers/generate_component_id';
import { retryTransientEsErrors } from './helpers/retry';

export async function deleteHistoryTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const historyTransformId = generateHistoryTransformId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.transform.deleteTransform(
          { transform_id: historyTransformId, force: true },
          { ignore: [404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot delete history transform [${definition.id}]: ${e}`);
    throw e;
  }
}

export async function deleteHistoryBackfillTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const historyBackfillTransformId = generateHistoryBackfillTransformId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.transform.deleteTransform(
          { transform_id: historyBackfillTransformId, force: true },
          { ignore: [404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot delete history backfill transform [${definition.id}]: ${e}`);
    throw e;
  }
}

export async function deleteLatestTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const latestTransformId = generateLatestTransformId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.transform.deleteTransform(
          { transform_id: latestTransformId, force: true },
          { ignore: [404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot delete latest transform [${definition.id}]`);
    throw e;
  }
}
