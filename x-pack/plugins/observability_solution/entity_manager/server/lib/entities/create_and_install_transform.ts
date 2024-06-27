/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { generateLatestTransform } from './transform/generate_latest_transform';
import { generateHistoryTransform } from './transform/generate_history_transform';

export async function createAndInstallHistoryTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const historyTransform = generateHistoryTransform(definition);
    await retryTransientEsErrors(() => esClient.transform.putTransform(historyTransform), {
      logger,
    });
  } catch (e) {
    logger.error(`Cannot create entity history transform for [${definition.id}] entity definition`);
    throw e;
  }
}

export async function createAndInstallLatestTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const latestTransform = generateLatestTransform(definition);
    await retryTransientEsErrors(() => esClient.transform.putTransform(latestTransform), {
      logger,
    });
  } catch (e) {
    logger.error(`Cannot create entity latest transform for [${definition.id}] entity definition`);
    throw e;
  }
}
