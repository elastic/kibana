/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { OAMDefinition } from '@kbn/oam-schema';
import { generateProcessors } from './ingest_pipeline/generate_processors';
import { retryTransientEsErrors } from './helpers/retry';
import { OAMSecurityException } from './errors/oam_security_exception';
import { generateIngestPipelineId } from './ingest_pipeline/generate_ingest_pipeline_id';

export async function createAndInstallIngestPipeline(
  esClient: ElasticsearchClient,
  definition: OAMDefinition,
  logger: Logger
) {
  const processors = generateProcessors(definition);
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
    logger.error(`Cannot create OAM ingest pipeline for [${definition.id}] entity defintion`);
    if (e.meta?.body?.error?.type === 'security_exception') {
      throw new OAMSecurityException(e.meta.body.error.reason, definition);
    }
    throw e;
  }
  return id;
}
