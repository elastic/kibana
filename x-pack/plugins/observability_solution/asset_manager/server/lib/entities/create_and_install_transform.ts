/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { EntitySecurityException } from './errors/entity_security_exception';
import { generateSummaryTransform } from './transform/generate_summary_transform';
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
    if (e.meta?.body?.error?.type === 'security_exception') {
      throw new EntitySecurityException(e.meta.body.error.reason, definition);
    }
    throw e;
  }
}

export async function createAndInstallSummaryTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const summaryTransform = generateSummaryTransform(definition);
    await retryTransientEsErrors(() => esClient.transform.putTransform(summaryTransform), {
      logger,
    });
  } catch (e) {
    logger.error(`Cannot create entity summary transform for [${definition.id}] entity definition`);
    if (e.meta?.body?.error?.type === 'security_exception') {
      throw new EntitySecurityException(e.meta.body.error.reason, definition);
    }
    throw e;
  }
}
