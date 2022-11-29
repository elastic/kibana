/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestPipelineProcessor,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { PauseMlInferencePipelineResponse } from '../../../../../../common/types/pipelines';

import { getInferencePipelineNameFromIndexName } from '../../../../../utils/ml_inference_pipeline_utils';

export const pauseInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  pause: boolean,
  client: ElasticsearchClient
) => {
  const response: PauseMlInferencePipelineResponse = { paused: undefined, pipelineName };
  const mlInferencePipelineId = getInferencePipelineNameFromIndexName(indexName);

  const mlInferencePipelineResponse = await client.ingest.getPipeline({
    id: mlInferencePipelineId,
  });

  const mlInferencePipeline = mlInferencePipelineResponse[mlInferencePipelineId];

  if (!mlInferencePipeline?.processors?.length) return response;

  const pipelineProcessorContainer = mlInferencePipeline.processors.find(
    (p) => !(p.pipeline !== undefined && p.pipeline.name === pipelineName)
  );

  if (!pipelineProcessorContainer?.pipeline) return response;
  const pipelineProcessor = pipelineProcessorContainer.pipeline;

  const currentIf = pipelineProcessor.if;
  const paused = pipelineProcessorIsPaused(pipelineProcessor);

  if (pause) {
    if (paused) {
      response.paused = true; // it's already paused, no need to update anything
    } else if (!currentIf) {
      pipelineProcessor.if = 'false'; // no if key, so just set it
    } else {
      pipelineProcessor.if = `false && ${currentIf}`; // prepend the if key with false &&
    }
  } else if (!paused || !currentIf) {
    response.paused = false;
  } else if (currentIf === 'false') {
    delete pipelineProcessor.if; // the if key is just false, so remove it entirely
  } else {
    // the if key has more conditionals that need to be preserved, so remove the false && prefix
    pipelineProcessor.if = currentIf.replace(/^false && /, '');
  }

  // only update the pipelineProcessor if it needs updating
  if (response.paused === undefined) {
    const updatedPipeline: IngestPutPipelineRequest = {
      ...mlInferencePipeline,
      id: mlInferencePipelineId,
    };

    const updateResponse = await client.ingest.putPipeline(updatedPipeline);
    if (!updateResponse.acknowledged) {
      throw Error; // need to throw something specific
    }
  }

  response.paused = pipelineProcessorIsPaused(pipelineProcessor);

  return response;
};

export const pipelineProcessorIsPaused = (pipelineProcessor: IngestPipelineProcessor): boolean => {
  return !!pipelineProcessor?.if?.startsWith('false');
};
