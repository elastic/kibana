/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { formatMlPipelineBody } from './create_pipeline_definitions';

export interface MlInferencePipeline extends IngestPipeline {
  version?: number;
}

export interface CreatedPipeline {
  created: string;
}

export const createMlInferencePipeline = async (
  pipelineName: string,
  modelId: string,
  sourceField: string,
  destinationField: string,
  esClient: ElasticsearchClient
): Promise<CreatedPipeline> => {
  // TODO: check if it exists getPipeline() -> if so, error
  const inferencePipelineGeneratedName = `ml-inference-${pipelineName}`;

  // TODO: use formatMlPipelineBody()
  const mlInferencePipeline = await formatMlPipelineBody(
    modelId,
    sourceField,
    destinationField,
    esClient
  );
  // const inferenceProcessorDefinition = {
  //   inference: {
  //     model_id: modelId,
  //     // source_field: sourceField,
  //     target_field: 'targetField',
  //   }
  // }

  // PUT _ingest/pipeline/ml-inference-{pipeline_name}
  await esClient.ingest.putPipeline({
    id: inferencePipelineGeneratedName,
    ...mlInferencePipeline,
  });

  return {
    created: inferencePipelineGeneratedName,
  };
};
