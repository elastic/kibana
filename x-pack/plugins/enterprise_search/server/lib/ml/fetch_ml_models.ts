/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig, MlTrainedModelStats } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { MlTrainedModels } from '@kbn/ml-plugin/server';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';

import { MlModelDeploymentState, MlModel } from '../../../common/types/ml';

export const ELSER_MODEL_ID = '.elser_model_2';
export const E5_MODEL_ID = '.multilingual-e5-small';
const LANG_IDENT_MODEL_ID = 'lang_ident_model_1';

const MODEL_TITLES_BY_TYPE: Record<string, string | undefined> = {
  fill_mask: i18n.translate('xpack.enterpriseSearch.content.ml_inference.fill_mask', {
    defaultMessage: 'Fill Mask',
  }),
  lang_ident: i18n.translate('xpack.enterpriseSearch.content.ml_inference.lang_ident', {
    defaultMessage: 'Language Identification',
  }),
  ner: i18n.translate('xpack.enterpriseSearch.content.ml_inference.ner', {
    defaultMessage: 'Named Entity Recognition',
  }),
  question_answering: i18n.translate(
    'xpack.enterpriseSearch.content.ml_inference.question_answering',
    {
      defaultMessage: 'Question Answering',
    }
  ),
  text_classification: i18n.translate(
    'xpack.enterpriseSearch.content.ml_inference.text_classification',
    {
      defaultMessage: 'Text Classification',
    }
  ),
  text_embedding: i18n.translate('xpack.enterpriseSearch.content.ml_inference.text_embedding', {
    defaultMessage: 'Dense Vector Text Embedding',
  }),
  text_expansion: i18n.translate('xpack.enterpriseSearch.content.ml_inference.text_expansion', {
    defaultMessage: 'Elastic Learned Sparse EncodeR (ELSER)',
  }),
  zero_shot_classification: i18n.translate(
    'xpack.enterpriseSearch.content.ml_inference.zero_shot_classification',
    {
      defaultMessage: 'Zero-Shot Text Classification',
    }
  ),
};

const BASE_MODEL = {
  deploymentState: MlModelDeploymentState.NotDeployed,
  nodeAllocationCount: 0,
  startTime: 0,
  targetAllocationCount: 0,
  threadsPerAllocation: 0,
  isPlaceholder: false,
  hasStats: false,
};

const ELSER_V2_MODEL_PLACEHOLDER: MlModel = {
  ...BASE_MODEL,
  modelId: ELSER_MODEL_ID,
  type: SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION,
  title: 'Elastic Learned Sparse EncodeR (ELSER)',
  description: i18n.translate('xpack.enterpriseSearch.modelCard.elserPlaceholder.description', {
    defaultMessage:
      'ELSER is designed to efficiently use context in natural language queries with better results than BM25 alone.',
  }),
  license: 'Elastic',
  isPlaceholder: true,
};

const E5_MODEL_PLACEHOLDER: MlModel = {
  ...BASE_MODEL,
  modelId: E5_MODEL_ID,
  type: SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING,
  title: 'E5 Multilingual Embedding',
  description: i18n.translate('xpack.enterpriseSearch.modelCard.e5Placeholder.description', {
    defaultMessage: 'Multilingual dense vector embedding generator.',
  }),
  license: 'MIT',
  modelDetailsPageUrl: 'https://huggingface.co/intfloat/multilingual-e5-small',
  isPlaceholder: true,
};

/**
 * Fetches and enriches trained model information and deployment status. Pins promoted models (ELSER, E5) to the top. If a promoted model doesn't exist, a placeholder will be used.
 *
 * @param trainedModelsProvider Trained ML models provider
 * @returns List of models
 */
export const fetchMlModels = async (
  trainedModelsProvider: MlTrainedModels | undefined
): Promise<MlModel[]> => {
  if (!trainedModelsProvider) {
    throw new Error('Machine Learning is not enabled');
  }

  // This array will contain all models, let's add placeholders first
  const models: MlModel[] = [ELSER_V2_MODEL_PLACEHOLDER, E5_MODEL_PLACEHOLDER];

  // Fetch all models and their deployment stats using the ML client
  const modelsResponse = await trainedModelsProvider.getTrainedModels({});
  if (modelsResponse.count === 0) {
    return models;
  }
  const modelsStatsResponse = await trainedModelsProvider.getTrainedModelsStats({});

  modelsResponse.trained_model_configs
    // Filter unsupported models
    .filter((modelConfig) => isSupportedModel(modelConfig))
    // Get corresponding model stats and compose full model object
    .map((modelConfig) =>
      getModel(
        modelConfig,
        modelsStatsResponse.trained_model_stats.find((m) => m.model_id === modelConfig.model_id)
      )
    )
    // Merge models with placeholders
    // (Note: properties from the placeholder that are undefined in the model are preserved)
    .forEach((model) => mergeModel(model, models));

  // Undeployed placeholder models might be in the Downloading phase; let's evaluate this with a call
  // We must do this one by one because the API doesn't support fetching multiple models with include=definition_status
  for (const model of models) {
    if (model.isPromoted && !model.isPlaceholder && !model.hasStats) {
      await enrichModelWithDownloadStatus(model, trainedModelsProvider);
    }
  }

  // Pin ELSER to the top, then E5 below, then the rest of the models sorted alphabetically
  return models.sort(sortModels);
};

const getModel = (modelConfig: MlTrainedModelConfig, modelStats?: MlTrainedModelStats): MlModel => {
  {
    const modelId = modelConfig.model_id;
    const type = modelConfig.inference_config ? Object.keys(modelConfig.inference_config)[0] : '';
    const model = {
      ...BASE_MODEL,
      modelId,
      type,
      title: getUserFriendlyTitle(modelId, type),
      isPromoted: [ELSER_MODEL_ID, E5_MODEL_ID].includes(modelId),
    };

    // Enrich deployment stats
    if (modelStats && modelStats.deployment_stats) {
      model.hasStats = true;
      model.deploymentState = getDeploymentState(
        modelStats.deployment_stats.allocation_status.state
      );
      model.nodeAllocationCount = modelStats.deployment_stats.allocation_status.allocation_count;
      model.targetAllocationCount =
        modelStats.deployment_stats.allocation_status.target_allocation_count;
      model.threadsPerAllocation = modelStats.deployment_stats.threads_per_allocation;
      model.startTime = modelStats.deployment_stats.start_time;
    } else if (model.modelId === LANG_IDENT_MODEL_ID) {
      model.deploymentState = MlModelDeploymentState.FullyAllocated;
    }

    return model;
  }
};

const enrichModelWithDownloadStatus = async (
  model: MlModel,
  trainedModelsProvider: MlTrainedModels
) => {
  const modelConfigWithDefinitionStatus = await trainedModelsProvider.getTrainedModels({
    model_id: model.modelId,
    include: 'definition_status',
  });

  if (modelConfigWithDefinitionStatus && modelConfigWithDefinitionStatus.count > 0) {
    model.deploymentState = modelConfigWithDefinitionStatus.trained_model_configs[0].fully_defined
      ? MlModelDeploymentState.Downloaded
      : MlModelDeploymentState.Downloading;
  }
};

const mergeModel = (model: MlModel, models: MlModel[]) => {
  const i = models.findIndex((m) => m.modelId === model.modelId);
  if (i >= 0) {
    const { title, ...modelWithoutTitle } = model;

    models[i] = Object.assign({}, models[i], modelWithoutTitle);
  } else {
    models.push(model);
  }
};

const isSupportedModel = (modelConfig: MlTrainedModelConfig) =>
  Object.keys(modelConfig.inference_config || {}).some((inferenceType) =>
    Object.keys(MODEL_TITLES_BY_TYPE).includes(inferenceType)
  ) || modelConfig.model_id === LANG_IDENT_MODEL_ID;

/**
 * Sort function for models; makes ELSER go to the top, then E5, then the rest of the models sorted by title.
 */
const sortModels = (m1: MlModel, m2: MlModel) =>
  m1.modelId === ELSER_MODEL_ID
    ? -1
    : m2.modelId === ELSER_MODEL_ID
    ? 1
    : m1.modelId === E5_MODEL_ID
    ? -1
    : m2.modelId === E5_MODEL_ID
    ? 1
    : m1.title.localeCompare(m2.title);

const getUserFriendlyTitle = (modelId: string, modelType: string) => {
  return MODEL_TITLES_BY_TYPE[modelType] !== undefined
    ? MODEL_TITLES_BY_TYPE[modelType]!
    : modelId === LANG_IDENT_MODEL_ID
    ? 'Lanugage Identification'
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
