/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const fetchMlInferencePipelineProcessors = async (
  client: ElasticsearchClient,
  indexName: string
) => {
  const mlInferencePipelineName = `${indexName}@ml-inference`;

  const {
    [mlInferencePipelineName]: { processors: mlInferencePipelineProcessors = [] },
  } = await client.ingest.getPipeline({
    id: mlInferencePipelineName,
  });

  const mlInferencePipelineProcessorNames = mlInferencePipelineProcessors
    .filter((obj: IngestProcessorContainer) => obj.hasOwnProperty('pipeline'))
    .map((obj: IngestProcessorContainer) => obj.pipeline?.name);

  const mlInferencePipelineProcessorConfigs = await client.ingest.getPipeline({
    id: mlInferencePipelineProcessorNames.join(),
  });

  const trainedModelIds = Object.keys(mlInferencePipelineProcessorConfigs).reduce(
    (modelIds, pipelineProcessor) => {
      // Get the processors for the current pipeline processor of the ML Inference Processor.
      const subProcessors = mlInferencePipelineProcessorConfigs[pipelineProcessor].processors || [];

      // Find the inference processor, which we can assume there will only be one.
      const inferenceProcessor = subProcessors.find((obj: IngestProcessorContainer) =>
        obj.hasOwnProperty('inference')
      );

      // Check to make sure we can an inference processor and add the model_id to the list.
      if (inferenceProcessor?.inference?.model_id)
        modelIds.push(inferenceProcessor.inference.model_id);

      return modelIds;
    },
    <string[]>[]
  );

  // Still need to extract the model_type from the trained models and the deployment_stats.state from the trainedModelStats
  const trainedModels = await client.ml.getTrainedModels({
    model_id: trainedModelIds.join(),
  });
  const trainedModelsStats = await client.ml.getTrainedModelsStats({
    model_id: trainedModelIds.join(),
  });

  // Need to return some big JSON blob. Maybe something like:
  // [
  //   {
  //     processorName,
  //     trainedModelId,
  //     deploymentStatus,
  //     modelType
  //   },
  //   ...
  // ]
  return {};
};
