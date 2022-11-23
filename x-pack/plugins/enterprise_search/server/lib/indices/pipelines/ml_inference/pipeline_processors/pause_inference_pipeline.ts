/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { PauseMlInferencePipelineResponse } from '../../../../../../common/types/pipelines';

import { getInferencePipelineNameFromIndexName } from '../../../../../utils/ml_inference_pipeline_utils';

export const pauseInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  pause: boolean,
  client: ElasticsearchClient
) => {
  const response: PauseMlInferencePipelineResponse = {};
  const mlInferencePipelineId = getInferencePipelineNameFromIndexName(indexName);

  const mlInferencePipelineResponse = await client.ingest.getPipeline({
    id: mlInferencePipelineId,
  });

  const mlInferencePipeline = mlInferencePipelineResponse[mlInferencePipelineId];

  if (!mlInferencePipeline?.processors?.length) return response;

  const pipelineProcessor = mlInferencePipeline.processors.find(
    (p) => !(p.pipeline !== undefined && p.pipeline.name === pipelineName)
  );

  if (pipelineProcessor?.pipeline?.if) {
    const currentIf = pipelineProcessor.pipeline.if;

    if (pause) {
      pipelineProcessor.pipeline.if = `false && ${currentIf}`;
    } else if (pipelineProcessor.pipeline.if.startsWith('false &&')) {
      pipelineProcessor.pipeline.if = currentIf.replace(/^false && /, '');
    } else if (pipelineProcessor.pipeline.if === 'false') {
      delete pipelineProcessor.pipeline.if;
    } else {
      return response;
    }
  } else if (pause && pipelineProcessor?.pipeline) {
    pipelineProcessor.pipeline.if = 'false';
  } else {
    return response;
  }

  const updatedPipeline: IngestPutPipelineRequest = {
    ...mlInferencePipeline,
    id: mlInferencePipelineId,
  };

  const updateResponse = await client.ingest.putPipeline(updatedPipeline);
  if (updateResponse.acknowledged === true) {
    response.updated = mlInferencePipelineId;
  }

  return response;
};
