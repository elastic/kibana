/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { IngestPipeline, IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

import { getMlModelConfigsForModelIds } from '../indices/fetch_ml_inference_pipeline_processors';

/**
 * Gets all ML inference pipelines. Redacts trained model IDs in those pipelines which reference
 * a model inaccessible in the current Kibana space.
 * @param esClient the Elasticsearch Client to use to fetch the errors.
 * @param trainedModelsProvider ML trained models provider.
 */
export const getMlInferencePipelines = async (
  esClient: ElasticsearchClient,
  trainedModelsProvider: MlTrainedModels | undefined,
): Promise<Record<string, IngestPipeline>> => {
  if (!trainedModelsProvider) {
    return Promise.reject(new Error('Machine Learning is not enabled'));
  }

  // Fetch all ML inference pipelines
  const fetchedInferencePipelines = await esClient.ingest.getPipeline({
    id: 'ml-inference-*',
  });

  // Fetch all trained models from the current Kibana space, and identify those that have their
  // model_id redacted
  const trainedModels = await getMlModelConfigsForModelIds(
    esClient,
    trainedModelsProvider,
  );
  const redactedModelIds = Object.values(trainedModels)
    .filter((modelConfig) => !modelConfig.modelId)
    .map((modelConfig) => modelConfig.trainedModelName);

  // Process pipelines: check if the model_id is one of the redacted ones, if so, redact it in the
  // result as well
  const inferencePipelinesResult: Record<string, IngestPipeline> = {};
  Object.keys(fetchedInferencePipelines).forEach((name) => {
    const inferencePipeline = fetchedInferencePipelines[name];

    inferencePipelinesResult[name] = isModelIdRedacted(inferencePipeline, redactedModelIds)
      ? redactModelId(inferencePipeline)
      : inferencePipeline;
  });

  return Promise.resolve(inferencePipelinesResult);
};

/**
 * Convenience function that finds the inference processor in a given ingest pipeline.
 * @param pipeline the pipeline.
 */
function getInferenceProcessor(pipeline: IngestPipeline): IngestProcessorContainer | undefined {
  const processors = pipeline.processors || [];

  return processors.find((processor) => processor.hasOwnProperty('inference'));
}

/**
 * Convenience function for evaluating whether the trained model the supplied pipeline references
 * is redacted.
 * @param pipeline the pipeline.
 * @param redactedModelIds Array of known redacted model IDs.
 */
 function isModelIdRedacted(pipeline: IngestPipeline, redactedModelIds: string[]) {
  const inferenceProcessor = getInferenceProcessor(pipeline);

  return inferenceProcessor?.inference && redactedModelIds.includes(inferenceProcessor.inference.model_id);
}

/**
 * Convenience function that redacts the trained model ID in a given ingest pipeline by setting it
 * to `model_id: ''`.
 * @param pipeline the pipeline to process.
 * @returns a copy of the input pipeline with the model ID redacted.
 */
function redactModelId(pipeline: IngestPipeline): IngestPipeline {
  const modifiedPipeline = { ...pipeline };

  const inferenceProcessor = getInferenceProcessor(modifiedPipeline);
  if (inferenceProcessor?.inference) {
    inferenceProcessor.inference.model_id = '';
  }

  return modifiedPipeline;
}
