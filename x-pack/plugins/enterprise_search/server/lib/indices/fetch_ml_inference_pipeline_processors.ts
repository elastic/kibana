/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import { BUILT_IN_MODEL_TAG } from '@kbn/ml-plugin/common/constants/data_frame_analytics';

import { InferencePipeline } from '../../../common/types/pipelines';
import { getInferencePipelineNameFromIndexName } from '../../utils/ml_inference_pipeline_utils';

export const fetchMlInferencePipelineProcessorNames = async (
  client: ElasticsearchClient,
  indexName: string
): Promise<string[]> => {
  try {
    const mlInferencePipelineName = getInferencePipelineNameFromIndexName(indexName);
    const {
      [mlInferencePipelineName]: { processors: mlInferencePipelineProcessors = [] },
    } = await client.ingest.getPipeline({
      id: mlInferencePipelineName,
    });

    return mlInferencePipelineProcessors
      .map((obj) => obj.pipeline?.name)
      .filter((name): name is string => name !== undefined);
  } catch (err) {
    // The GET /_ingest/pipeline API returns an empty object on 404 Not Found. If someone provides
    // a bad index name, catch the error and return an empty array of names.
    return [];
  }
};

export const fetchPipelineProcessorInferenceData = async (
  client: ElasticsearchClient,
  mlInferencePipelineProcessorNames: string[]
): Promise<InferencePipeline[]> => {
  const mlInferencePipelineProcessorConfigs = await client.ingest.getPipeline({
    id: mlInferencePipelineProcessorNames.join(),
  });

  return Object.keys(mlInferencePipelineProcessorConfigs).reduce(
    (pipelineProcessorData, pipelineProcessorName) => {
      // Get the processors for the current pipeline processor of the ML Inference Processor.
      const subProcessors =
        mlInferencePipelineProcessorConfigs[pipelineProcessorName].processors || [];

      // Find the inference processor, which we can assume there will only be one.
      const inferenceProcessor = subProcessors.find((obj) => obj.hasOwnProperty('inference'));

      const trainedModelName = inferenceProcessor?.inference?.model_id;
      if (trainedModelName)
        pipelineProcessorData.push({
          isDeployed: false,
          pipelineName: pipelineProcessorName,
          trainedModelName,
          types: [],
        });

      return pipelineProcessorData;
    },
    [] as InferencePipeline[]
  );
};

export const getMlModelTypesForModelConfig = (trainedModel: MlTrainedModelConfig): string[] => {
  if (!trainedModel) return [];

  const isBuiltIn = trainedModel.tags?.includes(BUILT_IN_MODEL_TAG);

  return [
    trainedModel.model_type,
    ...Object.keys(trainedModel.inference_config || {}),
    ...(isBuiltIn ? [BUILT_IN_MODEL_TAG] : []),
  ].filter((type): type is string => type !== undefined);
};

export const getMlModelConfigsForModelIds = async (
  client: ElasticsearchClient,
  trainedModelNames: string[]
): Promise<Record<string, InferencePipeline>> => {
  const [trainedModels, trainedModelsStats] = await Promise.all([
    client.ml.getTrainedModels({ model_id: trainedModelNames.join() }),
    client.ml.getTrainedModelsStats({ model_id: trainedModelNames.join() }),
  ]);

  const modelConfigs: Record<string, InferencePipeline> = {};

  trainedModels.trained_model_configs.forEach((trainedModelData) => {
    const trainedModelName = trainedModelData.model_id;

    if (trainedModelNames.includes(trainedModelName)) {
      modelConfigs[trainedModelName] = {
        isDeployed: false,
        pipelineName: '',
        trainedModelName,
        types: getMlModelTypesForModelConfig(trainedModelData),
      };
    }
  });

  trainedModelsStats.trained_model_stats.forEach((trainedModelStats) => {
    const trainedModelName = trainedModelStats.model_id;
    if (modelConfigs.hasOwnProperty(trainedModelName)) {
      const isDeployed = trainedModelStats.deployment_stats?.state === 'started';
      modelConfigs[trainedModelName].isDeployed = isDeployed;
    }
  });

  return modelConfigs;
};

export const fetchAndAddTrainedModelData = async (
  client: ElasticsearchClient,
  pipelineProcessorData: InferencePipeline[]
): Promise<InferencePipeline[]> => {
  const trainedModelNames = Array.from(
    new Set(pipelineProcessorData.map((pipeline) => pipeline.trainedModelName))
  );
  const modelConfigs = await getMlModelConfigsForModelIds(client, trainedModelNames);

  return pipelineProcessorData.map((data) => {
    const model = modelConfigs[data.trainedModelName];
    if (!model) {
      return data;
    }
    const { types, isDeployed } = model;
    return {
      ...data,
      types,
      isDeployed,
    };
  });
};

export const fetchMlInferencePipelineProcessors = async (
  client: ElasticsearchClient,
  indexName: string
): Promise<InferencePipeline[]> => {
  const mlInferencePipelineProcessorNames = await fetchMlInferencePipelineProcessorNames(
    client,
    indexName
  );

  // Elasticsearch's GET pipelines API call will return all of the pipeline data if no ids are
  // provided. If we didn't find pipeline processors, return early to avoid fetching all of
  // the possible pipeline data.
  if (mlInferencePipelineProcessorNames.length === 0) return [] as InferencePipeline[];

  let pipelineProcessorInferenceData = await fetchPipelineProcessorInferenceData(
    client,
    mlInferencePipelineProcessorNames
  );

  // Elasticsearch's GET trained models and GET trained model stats API calls will return the
  // data/stats for all of the trained models if no ids are provided. If we didn't find any
  // inference processors, return early to avoid fetching all of the possible trained model data.
  if (pipelineProcessorInferenceData.length === 0) return [] as InferencePipeline[];

  return await fetchAndAddTrainedModelData(client, pipelineProcessorInferenceData);
};
