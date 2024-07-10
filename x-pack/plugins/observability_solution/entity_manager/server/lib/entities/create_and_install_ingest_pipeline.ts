/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import {
  generateHistoryIngestPipelineId,
  generateLatestIngestPipelineId,
} from './helpers/generate_component_id';
import { retryTransientEsErrors } from './helpers/retry';
import { generateHistoryProcessors } from './ingest_pipeline/generate_history_processors';
import { generateLatestProcessors } from './ingest_pipeline/generate_latest_processors';

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
          _meta: {
            definitionVersion: definition.version,
          },
        }),
      { logger }
    );
  } catch (e) {
    logger.error(
      `Cannot create entity history ingest pipelines for [${definition.id}] entity defintion`
    );
    throw e;
  }
}
export async function createAndInstallLatestIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const latestProcessors = generateLatestProcessors(definition);
    const latestId = generateLatestIngestPipelineId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.ingest.putPipeline({
          id: latestId,
          processors: latestProcessors,
          _meta: {
            definitionVersion: definition.version,
          },
        }),
      { logger }
    );
  } catch (e) {
    logger.error(
      `Cannot create entity latest ingest pipelines for [${definition.id}] entity defintion`
    );
    throw e;
  }
}
