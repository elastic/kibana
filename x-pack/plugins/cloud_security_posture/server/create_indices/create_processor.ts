/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * @param pipelineId - the pipeline id to create. If a pipeline with the same pipelineId already exists, nothing is created or updated.
 *
 * @return true if the pipeline exits or created, false otherwise.
 */
export const createPipelineIfNotExists = async (
  esClient: ElasticsearchClient,
  pipelineId: string,
  logger: Logger
) => {
  try {
    await esClient.ingest.getPipeline({ id: pipelineId });
    logger.trace(`pipeline: ${pipelineId} already exists`);
    return true;
  } catch (exitErr) {
    const exitError = transformError(exitErr);
    if (exitError.statusCode === 404) {
      try {
        await esClient.ingest.putPipeline({
          id: pipelineId,
          description: 'Pipeline for adding event timestamp',
          processors: [
            {
              set: {
                field: '@timestamp',
                value: '{{_ingest.timestamp}}',
              },
            },
          ],
          on_failure: [
            {
              set: {
                field: 'error.message',
                value: '{{ _ingest.on_failure_message }}',
              },
            },
          ],
        });
        logger.trace(`pipeline: ${pipelineId} was created`);
        return true;
      } catch (existError) {
        logger.error(`Failed to create CSP pipeline ${pipelineId}. error: ${existError.message}`);
        return false;
      }
    } else {
      logger.error(
        `Failed to check if CSP pipeline ${pipelineId} exists. error: ${exitError.message}`
      );
    }
  }
  return false;
};
