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
import { generateSummaryProcessors } from './ingest_pipeline/generate_summary_processors';
import { generateSummaryIngestPipelineId } from './ingest_pipeline/generate_summary_ingest_pipeline_id';
import { generateHistoryProcessors } from './ingest_pipeline/generate_history_processors';
import { generateHistoryIngestPipelineId } from './ingest_pipeline/generate_history_ingest_pipeline_id';

export async function createAndInstallHistoryIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const historyProcessors = generateHistoryProcessors(definition);
    const historyId = generateHistoryIngestPipelineId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.ingest.putPipeline({
          id: historyId,
          processors: historyProcessors,
        }),
      { logger }
    );
  } catch (e) {
    logger.error(
      `Cannot create entity history ingest pipelines for [${definition.id}] entity defintion`
    );
    if (e.meta?.body?.error?.type === 'security_exception') {
      throw new EntitySecurityException(e.meta.body.error.reason, definition);
    }
    throw e;
  }
}
export async function createAndInstallSummaryIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const summaryProcessors = generateSummaryProcessors(definition);
    const summaryId = generateSummaryIngestPipelineId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.ingest.putPipeline({
          id: summaryId,
          processors: summaryProcessors,
        }),
      { logger }
    );
  } catch (e) {
    logger.error(
      `Cannot create entity summary ingest pipelines for [${definition.id}] entity defintion`
    );
    if (e.meta?.body?.error?.type === 'security_exception') {
      throw new EntitySecurityException(e.meta.body.error.reason, definition);
    }
    throw e;
  }
}
