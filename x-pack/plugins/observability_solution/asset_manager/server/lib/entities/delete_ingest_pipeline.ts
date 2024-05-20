/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateIngestPipelineId } from './ingest_pipeline/generate_ingest_pipeline_id';
import { retryTransientEsErrors } from './helpers/retry';

export async function deleteIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  const pipelineId = generateIngestPipelineId(definition);
  try {
    await retryTransientEsErrors(() =>
      esClient.ingest.deletePipeline({ id: pipelineId }, { ignore: [404] })
    );
  } catch (e) {
    logger.error(`Unable to delete ingest pipeline [${pipelineId}]`);
    throw e;
  }
}
