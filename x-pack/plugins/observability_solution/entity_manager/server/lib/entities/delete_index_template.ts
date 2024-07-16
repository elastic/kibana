/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';

export async function deleteIndices(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const latestPipelineId = generateLatestIngestPipelineId(definition);
    await retryTransientEsErrors(() => esClient.searchTemplate.delete({}));
  } catch (e) {
    logger.error(`Unable to delete latest ingest pipeline [${definition.id}].`);
    throw e;
  }
}
