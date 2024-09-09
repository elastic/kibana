/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig, MlTrainedModelStats } from '@elastic/elasticsearch/lib/api/types';

import { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import {
  E5_LINUX_OPTIMIZED_MODEL_ID,
  E5_MODEL_ID,
  ELSER_LINUX_OPTIMIZED_MODEL_ID,
  ELSER_MODEL_ID,
  LANG_IDENT_MODEL_ID,
} from '@kbn/ml-trained-models-utils';

import { getMlModelTypesForModelConfig } from '../../../common/ml_inference_pipeline';

import { MlModelDeploymentState, MlModel } from '../../../common/types/ml';

import {
  BASE_MODEL,
  ELSER_LINUX_OPTIMIZED_MODEL_PLACEHOLDER,
  ELSER_MODEL_PLACEHOLDER,
  E5_LINUX_OPTIMIZED_MODEL_PLACEHOLDER,
  E5_MODEL_PLACEHOLDER,
  MODEL_TITLES_BY_TYPE,
} from './utils';

let compatibleElserModelId = ELSER_MODEL_ID;
let compatibleE5ModelId = E5_MODEL_ID;

/**
 * Fetches and enriches trained model information and deployment status. Pins promoted models (ELSER, E5) to the top. If a promoted model doesn't exist, a placeholder will be used.
 *
 * @param trainedModelsProvider Trained ML models provider
 * @returns List of models
 */
export const fetchMlModels = async (
  trainedModelsProvider: MlTrainedModels | undefined,
  log: Logger
): Promise<MlModel[]> => {
  if (!trainedModelsProvider) {
    throw new Error('Machine Learning is not enabled');
  }

  // Set the compatible ELSER and E5 model IDs based on platform architecture
  [compatibleElserModelId, compatibleE5ModelId] = await fetchCompatiblePromotedModelIds(
    trainedModelsProvider
  );

  // Get compatible variants of placeholder models
  const modelPlaceholders: MlModel[] = [
    ELSER_MODEL_PLACEHOLDER,
    ELSER_LINUX_OPTIMIZED_MODEL_PLACEHOLDER,
    E5_MODEL_PLACEHOLDER,
    E5_LINUX_OPTIMIZED_MODEL_PLACEHOLDER,
  ].filter((model) => isCompatiblePromotedModelId(model.modelId));

  // Fetch all models and their deployment stats using the ML client
  const modelsResponse = await trainedModelsProvider.getTrainedModels({});
  if (modelsResponse.count === 0) {
    return modelPlaceholders;
  }
  const modelsStatsResponse = await trainedModelsProvider.getTrainedModelsStats({});
  const fetchedModels = modelsResponse.trained_model_configs
    // Filter unsupported models
    .filter((modelConfig) => isSupportedModel(modelConfig))
    // Get corresponding model stats and compose full model object
    .map((modelConfig) =>
      getModel(
        modelConfig,
        modelsStatsResponse.trained_model_stats.find((m) => m.model_id === modelConfig.model_id)
      )
    );

  // Merge fetched models with placeholders
  const mergedModels = mergeModels(modelPlaceholders, fetchedModels);

  // Undeployed placeholder models might be in the Downloading phase; let's evaluate this with a call
  // We must do this one by one because the API doesn't support fetching multiple models with include=definition_status
  const enrichedModelPromises = mergedModels.map((model) =>
    enrichModelWithDownloadStatus(model, trainedModelsProvider, log)
  );
  const enrichedModels = await Promise.all(enrichedModelPromises);

  // Pin ELSER to the top, then E5 below, then the rest of the models sorted alphabetically
  return enrichedModels.sort(sortModels);
};

/**
 * Fetches model IDs of promoted models (ELSER, E5) that are compatible with the platform architecture. The fetches
 * are executed in parallel.
 * Defaults to the cross-platform variant of a model if its ID is not present in the trained models client's response.
 * @param trainedModelsProvider Trained ML models provider
 * @returns Array of model IDs [0: ELSER, 1: E5]
 */
export const fetchCompatiblePromotedModelIds = async (trainedModelsProvider: MlTrainedModels) => {
  const compatibleModelConfigs = await Promise.all([
    trainedModelsProvider.getCuratedModelConfig('elser', { version: 2 }),
    trainedModelsProvider.getCuratedModelConfig('e5'),
  ]);

  return [
    compatibleModelConfigs.find((modelConfig) => modelConfig?.modelName === 'elser')?.model_id ??
      ELSER_MODEL_ID,
    compatibleModelConfigs.find((modelConfig) => modelConfig?.modelName === 'e5')?.model_id ??
      E5_MODEL_ID,
  ];
};

const getModel = (modelConfig: MlTrainedModelConfig, modelStats?: MlTrainedModelStats): MlModel => {
  const modelId = modelConfig.model_id;
  const type = modelConfig.inference_config ? Object.keys(modelConfig.inference_config)[0] : '';
  const model = {
    ...BASE_MODEL,
    modelId,
    type,
    title: getUserFriendlyTitle(modelId, type),
    description: modelConfig.description,
    types: getMlModelTypesForModelConfig(modelConfig),
    inputFieldNames: modelConfig.input.field_names,
    version: modelConfig.version,
    isPromoted: [
      ELSER_MODEL_ID,
      ELSER_LINUX_OPTIMIZED_MODEL_ID,
      E5_MODEL_ID,
      E5_LINUX_OPTIMIZED_MODEL_ID,
    ].includes(modelId),
  };

  // Enrich deployment stats
  if (modelStats && modelStats.deployment_stats) {
    model.hasStats = true;
    model.deploymentState = getDeploymentState(modelStats.deployment_stats.allocation_status.state);
    model.nodeAllocationCount = modelStats.deployment_stats.allocation_status.allocation_count;
    model.targetAllocationCount =
      modelStats.deployment_stats.allocation_status.target_allocation_count;
    model.threadsPerAllocation = modelStats.deployment_stats.threads_per_allocation;
    model.startTime = modelStats.deployment_stats.start_time;
  } else if (model.modelId === LANG_IDENT_MODEL_ID) {
    model.deploymentState = MlModelDeploymentState.FullyAllocated;
  }

  return model;
};

const enrichModelWithDownloadStatus = (
  model: MlModel,
  trainedModelsProvider: MlTrainedModels,
  log: Logger
) => {
  // Only enrich promoted non-placeholder models
  if (!model.isPromoted || model.isPlaceholder || model.hasStats) {
    return Promise.resolve(model);
  }

  return trainedModelsProvider
    .getTrainedModels({
      model_id: model.modelId,
      include: 'definition_status',
    })
    .then((modelConfigWithDefinitionStatus) => {
      // We're using NotDeployed for downloaded models. Downloaded is also a valid status, but we want to have the same
      // status badge as for 3rd party models.
      return {
        ...model,
        ...(modelConfigWithDefinitionStatus.count > 0
          ? {
              deploymentState: modelConfigWithDefinitionStatus.trained_model_configs[0]
                .fully_defined
                ? MlModelDeploymentState.NotDeployed
                : MlModelDeploymentState.Downloading,
            }
          : {}),
      };
    })
    .catch((err) => {
      // Log and swallow error
      log.warn(`Failed to retrieve definition status of model ${model.modelId}: ${err}`);
      return model;
    });
};

const mergeModels = (modelPlaceholders: MlModel[], fetchedModels: MlModel[]) => [
  // Placeholder models that have no fetched model counterparts
  ...modelPlaceholders.filter((m) => !fetchedModels.find((f) => f.modelId === m.modelId)),
  // Combined fetched and placeholder models
  ...fetchedModels.map((f) => {
    const modelPlaceholder = modelPlaceholders.find((m) => m.modelId === f.modelId);
    if (modelPlaceholder) {
      // Keep title, description and those properties from placeholder that are undefined in fetched model
      const { title, description, ...modelWithoutTitleAndDescription } = f;
      return Object.assign({}, modelPlaceholder, modelWithoutTitleAndDescription);
    }

    return f;
  }),
];

const isCompatiblePromotedModelId = (modelId: string) =>
  [compatibleElserModelId, compatibleE5ModelId].includes(modelId);

/**
 * A model is supported if:
 * - The inference type is supported, AND
 * - The model is the compatible variant of ELSER/E5, or it's a 3rd party model
 */
const isSupportedModel = (modelConfig: MlTrainedModelConfig) =>
  isSupportedInferenceType(modelConfig) &&
  ((!modelConfig.model_id.startsWith(ELSER_MODEL_ID) &&
    !modelConfig.model_id.startsWith(E5_MODEL_ID)) ||
    isCompatiblePromotedModelId(modelConfig.model_id));

const isSupportedInferenceType = (modelConfig: MlTrainedModelConfig) =>
  Object.keys(modelConfig.inference_config || {}).some((inferenceType) =>
    Object.keys(MODEL_TITLES_BY_TYPE).includes(inferenceType)
  ) || modelConfig.model_id === LANG_IDENT_MODEL_ID;

/**
 * Sort function for models; makes ELSER go to the top, then E5, then the rest of the models sorted by title.
 */
const sortModels = (m1: MlModel, m2: MlModel) =>
  m1.modelId.startsWith(ELSER_MODEL_ID)
    ? -1
    : m2.modelId.startsWith(ELSER_MODEL_ID)
    ? 1
    : m1.modelId.startsWith(E5_MODEL_ID)
    ? -1
    : m2.modelId.startsWith(E5_MODEL_ID)
    ? 1
    : m1.title.localeCompare(m2.title);

const getUserFriendlyTitle = (modelId: string, modelType: string) => {
  return MODEL_TITLES_BY_TYPE[modelType] !== undefined
    ? MODEL_TITLES_BY_TYPE[modelType]!
    : modelId === LANG_IDENT_MODEL_ID
    ? i18n.translate('xpack.enterpriseSearch.content.ml_inference.lang_ident', {
        defaultMessage: 'Language Identification',
      })
    : modelId;
};

const getDeploymentState = (state: string): MlModelDeploymentState => {
  switch (state) {
    case 'starting':
      return MlModelDeploymentState.Starting;
    case 'started':
      return MlModelDeploymentState.Started;
    case 'fully_allocated':
      return MlModelDeploymentState.FullyAllocated;
  }

  return MlModelDeploymentState.NotDeployed;
};
