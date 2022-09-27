/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import { BUILT_IN_MODEL_TAG } from '@kbn/ml-plugin/common/constants/data_frame_analytics';

import { InferencePipeline, TrainedModelState } from '../../../common/types/pipelines';
import { getInferencePipelineNameFromIndexName } from '../../utils/ml_inference_pipeline_utils';

export type InferencePipelineData = InferencePipeline & {
  trainedModelName: string;
};

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
): Promise<InferencePipelineData[]> => {
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
          modelState: TrainedModelState.NotDeployed,
          pipelineName: pipelineProcessorName,
          trainedModelName,
          types: [],
        });

      return pipelineProcessorData;
    },
    [] as InferencePipelineData[]
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
): Promise<Record<string, InferencePipelineData>> => {
  const [trainedModels, trainedModelsStats] = await Promise.all([
    client.ml.getTrainedModels({ model_id: trainedModelNames.join() }),
    client.ml.getTrainedModelsStats({ model_id: trainedModelNames.join() }),
  ]);

  const modelConfigs: Record<string, InferencePipelineData> = {};

  trainedModels.trained_model_configs.forEach((trainedModelData) => {
    const trainedModelName = trainedModelData.model_id;

    if (trainedModelNames.includes(trainedModelName)) {
      modelConfigs[trainedModelName] = {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: '',
        trainedModelName,
        types: getMlModelTypesForModelConfig(trainedModelData),
      };
    }
  });

  trainedModelsStats.trained_model_stats.forEach((trainedModelStats) => {
    const trainedModelName = trainedModelStats.model_id;
    if (modelConfigs.hasOwnProperty(trainedModelName)) {
      let modelState: TrainedModelState;
      switch (trainedModelStats.deployment_stats?.state) {
        case 'started':
          modelState = TrainedModelState.Started;
          break;
        case 'starting':
          modelState = TrainedModelState.Starting;
          break;
        case 'stopping':
          modelState = TrainedModelState.Stopping;
          break;
        // @ts-ignore: type is wrong, "failed" is a possible state
        case 'failed':
          modelState = TrainedModelState.Failed;
          break;
        default:
          modelState = TrainedModelState.NotDeployed;
          break;
      }
      modelConfigs[trainedModelName].modelState = modelState;
      modelConfigs[trainedModelName].modelStateReason = trainedModelStats.deployment_stats?.reason;
    }
  });

  return modelConfigs;
};

export const fetchAndAddTrainedModelData = async (
  client: ElasticsearchClient,
  pipelineProcessorData: InferencePipelineData[]
): Promise<InferencePipelineData[]> => {
  const trainedModelNames = Array.from(
    new Set(pipelineProcessorData.map((pipeline) => pipeline.trainedModelName))
  );
  const modelConfigs = await getMlModelConfigsForModelIds(client, trainedModelNames);

  return pipelineProcessorData.map((data) => {
    const model = modelConfigs[data.trainedModelName];
    if (!model) {
      return data;
    }
    const { types, modelState, modelStateReason } = model;
    return {
      ...data,
      types,
      modelState,
      modelStateReason,
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

  const pipelineProcessorInferenceData = await fetchPipelineProcessorInferenceData(
    client,
    mlInferencePipelineProcessorNames
  );

  // Elasticsearch's GET trained models and GET trained model stats API calls will return the
  // data/stats for all of the trained models if no ids are provided. If we didn't find any
  // inference processors, return early to avoid fetching all of the possible trained model data.
  if (pipelineProcessorInferenceData.length === 0) return [] as InferencePipeline[];

  const pipelines = await fetchAndAddTrainedModelData(client, pipelineProcessorInferenceData);

  // Due to restrictions with Kibana spaces we do not want to return the trained model name
  // to the UI. So we remove it from the data structure here.
  return pipelines.map(({ trainedModelName, ...pipeline }) => pipeline);
};
