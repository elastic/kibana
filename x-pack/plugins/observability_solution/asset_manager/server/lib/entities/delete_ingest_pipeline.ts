/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { generateSummaryIngestPipelineId } from './ingest_pipeline/generate_summary_ingest_pipeline_id';
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

export async function deleteSummaryIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const summaryPipelineId = generateSummaryIngestPipelineId(definition);
    await retryTransientEsErrors(() =>
      esClient.ingest.deletePipeline({ id: summaryPipelineId }, { ignore: [404] })
    );
  } catch (e) {
    logger.error(`Unable to delete summary ingest pipeline [${definition.id}].`);
    throw e;
  }
}
