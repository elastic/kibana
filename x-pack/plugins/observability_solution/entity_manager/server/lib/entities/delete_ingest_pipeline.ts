/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { generateLatestIngestPipelineId } from './ingest_pipeline/generate_latest_ingest_pipeline_id';
import { generateHistoryIngestPipelineId } from './ingest_pipeline/generate_history_ingest_pipeline_id';

export async function deleteHistoryIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const historyPipelineId = generateHistoryIngestPipelineId(definition);
    await retryTransientEsErrors(() =>
      esClient.ingest.deletePipeline({ id: historyPipelineId }, { ignore: [404] })
    );
  } catch (e) {
    logger.error(`Unable to delete history ingest pipeline [${definition.id}].`);
    throw e;
  }
}

export async function deleteLatestIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const latestPipelineId = generateLatestIngestPipelineId(definition);
    await retryTransientEsErrors(() =>
      esClient.ingest.deletePipeline({ id: latestPipelineId }, { ignore: [404] })
    );
  } catch (e) {
    logger.error(`Unable to delete latest ingest pipeline [${definition.id}].`);
    throw e;
  }
}
