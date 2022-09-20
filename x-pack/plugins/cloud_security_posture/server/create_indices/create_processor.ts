/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  CSP_INGEST_TIMESTAMP_PIPELINE,
  CSP_LATEST_FINDINGS_INGEST_TIMESTAMP_PIPELINE,
} from '../../common/constants';

/**
 * @param pipelineId - the pipeline id to create. If a pipeline with the same pipelineId already exists, nothing is created or updated.
 * @param logger - logger
 * @param esClient - the elasticsearch client
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
        const ingest = getPipelineById(pipelineId);
        await esClient.ingest.putPipeline(ingest);
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

export const getPipelineById = (id: string): IngestPutPipelineRequest => {
  switch (id) {
    case CSP_INGEST_TIMESTAMP_PIPELINE: {
      return scorePipelineIngest;
    }
    case CSP_LATEST_FINDINGS_INGEST_TIMESTAMP_PIPELINE: {
      return latestFindingsPipelineIngest;
    }
    default:
      throw new Error('No ingest pipeline was found for this Id');
  }
};

const scorePipelineIngest = {
  id: CSP_INGEST_TIMESTAMP_PIPELINE,
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
};

const latestFindingsPipelineIngest = {
  id: CSP_LATEST_FINDINGS_INGEST_TIMESTAMP_PIPELINE,
  description: 'Pipeline for cloudbeat latest findings index',
  processors: [
    {
      set: {
        field: 'event.ingested',
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
};
