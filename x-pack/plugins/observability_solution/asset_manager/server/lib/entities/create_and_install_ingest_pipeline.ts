/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateProcessors } from './ingest_pipeline/generate_processors';
import { retryTransientEsErrors } from './helpers/retry';
import { EntitySecurityException } from './errors/entity_security_exception';
import { generateIngestPipelineId } from './ingest_pipeline/generate_ingest_pipeline_id';

export async function createAndInstallIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger,
  spaceId: string
) {
  const processors = generateProcessors(definition, spaceId);
  const id = generateIngestPipelineId(definition);
  try {
    await retryTransientEsErrors(
      () =>
        esClient.ingest.putPipeline({
          id,
          processors,
        }),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot create entity ingest pipeline for [${definition.id}] entity definition`);
    if (e.meta?.body?.error?.type === 'security_exception') {
      throw new EntitySecurityException(e.meta.body.error.reason, definition);
    }
    throw e;
  }
  return id;
}
