/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockLogger } from '../../__mocks__';

import { MlTrainedModels } from '@kbn/ml-plugin/server';

import {
  E5_LINUX_OPTIMIZED_MODEL_ID,
  E5_MODEL_ID,
  ELSER_LINUX_OPTIMIZED_MODEL_ID,
  ELSER_MODEL_ID,
} from '@kbn/ml-trained-models-utils';

import { MlModelDeploymentState } from '../../../common/types/ml';

import { fetchMlModels } from './fetch_ml_models';

describe('fetchMlModels', () => {
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
    getTrainedModelsStats: jest.fn(),
    getCuratedModelConfig: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // getCuratedModelConfig() default behavior is to return the cross-platform models
    mockTrainedModelsProvider.getCuratedModelConfig.mockImplementation((modelName) => ({
      model_id: modelName === 'elser' ? ELSER_MODEL_ID : E5_MODEL_ID,
      modelName,
    }));
  });

  it('errors when there is no trained model provider', async () => {
    await expect(() => fetchMlModels(undefined, mockLogger)).rejects.toThrowError(
      'Machine Learning is not enabled'
    );
  });

  it('returns placeholders if no model is found', async () => {
    const mockModelConfigs = {
      count: 0,
      trained_model_configs: [],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockModelConfigs)
    );

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(2);
    expect(models[0]).toMatchObject({
      modelId: ELSER_MODEL_ID,
      isPlaceholder: true,
      deploymentState: MlModelDeploymentState.NotDeployed,
    });
    expect(models[1]).toMatchObject({
      modelId: E5_MODEL_ID,
      isPlaceholder: true,
      deploymentState: MlModelDeploymentState.NotDeployed,
    });
    expect(mockTrainedModelsProvider.getTrainedModelsStats).not.toHaveBeenCalled();
  });

  it('combines existing models with placeholders', async () => {
    const mockModelConfigs = {
      count: 2,
      trained_model_configs: [
        {
          model_id: E5_MODEL_ID,
          inference_config: {
            text_embedding: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: 'model_1',
          inference_config: {
            text_classification: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
      ],
    };
    const mockModelStats = {
      trained_model_stats: [
        {
          model_id: E5_MODEL_ID,
        },
        {
          model_id: 'model_1',
        },
      ],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockModelConfigs)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockModelStats)
    );

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(3);
    expect(models[0].modelId).toEqual(ELSER_MODEL_ID); // Placeholder
    expect(models[1]).toMatchObject({
      modelId: E5_MODEL_ID,
      isPlaceholder: false,
    });
    expect(models[2]).toMatchObject({
      modelId: 'model_1',
      isPlaceholder: false,
    });
  });

  it('filters non-supported models', async () => {
    const mockModelConfigs = {
      count: 2,
      trained_model_configs: [
        {
          model_id: 'model_1',
          inference_config: {
            not_supported_1: {},
          },
        },
        {
          model_id: 'model_2',
          inference_config: {
            not_supported_2: {},
          },
        },
      ],
    };
    const mockModelStats = {
      trained_model_stats: mockModelConfigs.trained_model_configs.map((modelConfig) => ({
        model_id: modelConfig.model_id,
      })),
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockModelConfigs)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockModelStats)
    );

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(2);
    expect(models[0].modelId).toEqual(ELSER_MODEL_ID); // Placeholder
    expect(models[1].modelId).toEqual(E5_MODEL_ID); // Placeholder
  });

  it('filters incompatible model variants of promoted models', async () => {
    const mockModelConfigs = {
      count: 2,
      trained_model_configs: [
        {
          model_id: E5_MODEL_ID,
          inference_config: {
            text_embedding: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: E5_LINUX_OPTIMIZED_MODEL_ID,
          inference_config: {
            text_embedding: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: ELSER_MODEL_ID,
          inference_config: {
            text_expansion: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: ELSER_LINUX_OPTIMIZED_MODEL_ID,
          inference_config: {
            text_expansion: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
      ],
    };
    const mockModelStats = {
      trained_model_stats: mockModelConfigs.trained_model_configs.map((modelConfig) => ({
        model_id: modelConfig.model_id,
      })),
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockModelConfigs)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockModelStats)
    );

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(2);
    expect(models[0].modelId).toEqual(ELSER_MODEL_ID);
    expect(models[1].modelId).toEqual(E5_MODEL_ID);
  });

  it('filters incompatible model variants of promoted models (Linux variants)', async () => {
    const mockModelConfigs = {
      count: 2,
      trained_model_configs: [
        {
          model_id: E5_MODEL_ID,
          inference_config: {
            text_embedding: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: E5_LINUX_OPTIMIZED_MODEL_ID,
          inference_config: {
            text_embedding: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: ELSER_MODEL_ID,
          inference_config: {
            text_expansion: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: ELSER_LINUX_OPTIMIZED_MODEL_ID,
          inference_config: {
            text_expansion: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
      ],
    };
    const mockModelStats = {
      trained_model_stats: mockModelConfigs.trained_model_configs.map((modelConfig) => ({
        model_id: modelConfig.model_id,
      })),
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockModelConfigs)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockModelStats)
    );
    mockTrainedModelsProvider.getCuratedModelConfig.mockImplementation((modelName) => ({
      model_id:
        modelName === 'elser' ? ELSER_LINUX_OPTIMIZED_MODEL_ID : E5_LINUX_OPTIMIZED_MODEL_ID,
      modelName,
    }));

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(2);
    expect(models[0].modelId).toEqual(ELSER_LINUX_OPTIMIZED_MODEL_ID);
    expect(models[1].modelId).toEqual(E5_LINUX_OPTIMIZED_MODEL_ID);
  });

  it('sets deployment state on models', async () => {
    const mockModelConfigs = {
      count: 3,
      trained_model_configs: [
        {
          model_id: ELSER_MODEL_ID,
          inference_config: {
            text_expansion: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: E5_MODEL_ID,
          inference_config: {
            text_embedding: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: 'model_1',
          inference_config: {
            ner: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
      ],
    };
    const mockModelStats = {
      trained_model_stats: [
        {
          model_id: ELSER_MODEL_ID,
          deployment_stats: {
            allocation_status: {
              state: 'fully_allocated',
            },
          },
        },
        {
          model_id: E5_MODEL_ID,
          deployment_stats: {
            allocation_status: {
              state: 'started',
            },
          },
        },
        {
          model_id: 'model_1', // No deployment_stats -> not deployed
        },
      ],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockModelConfigs)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockModelStats)
    );

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(3);
    expect(models[0]).toMatchObject({
      modelId: ELSER_MODEL_ID,
      deploymentState: MlModelDeploymentState.FullyAllocated,
    });
    expect(models[1]).toMatchObject({
      modelId: E5_MODEL_ID,
      deploymentState: MlModelDeploymentState.Started,
    });
    expect(models[2]).toMatchObject({
      modelId: 'model_1',
      deploymentState: MlModelDeploymentState.NotDeployed,
    });
  });

  it('determines downloading/downloaded deployment state for promoted models', async () => {
    const mockModelConfigs = {
      count: 1,
      trained_model_configs: [
        {
          model_id: ELSER_MODEL_ID,
          inference_config: {
            text_expansion: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
      ],
    };
    const mockModelConfigsWithDefinition = {
      count: 1,
      trained_model_configs: [
        {
          ...mockModelConfigs.trained_model_configs[0],
          fully_defined: true,
        },
      ],
    };
    const mockModelStats = {
      trained_model_stats: [
        {
          model_id: ELSER_MODEL_ID, // No deployment_stats -> not deployed
        },
      ],
    };

    // 1st call: get models
    // 2nd call: get definition_status for ELSER
    mockTrainedModelsProvider.getTrainedModels
      .mockImplementationOnce(() => Promise.resolve(mockModelConfigs))
      .mockImplementationOnce(() => Promise.resolve(mockModelConfigsWithDefinition));
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockModelStats)
    );

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(2);
    expect(models[0]).toMatchObject({
      modelId: ELSER_MODEL_ID,
      deploymentState: MlModelDeploymentState.NotDeployed,
    });
    expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalledTimes(2);
  });

  it('gracefully handles errors when fetching downloading/downloaded deployment state for promoted models', async () => {
    const mockModelConfigs = {
      count: 1,
      trained_model_configs: [
        {
          model_id: ELSER_MODEL_ID,
          inference_config: {
            text_expansion: {},
          },
          input: {
            fields: ['text_field'],
          },
        },
      ],
    };

    // 1st call: get models
    // 2nd call: error while getting definition_status for ELSER
    mockTrainedModelsProvider.getTrainedModels
      .mockImplementationOnce(() => Promise.resolve(mockModelConfigs))
      .mockImplementationOnce(() => Promise.reject('some error'));

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(2);
    expect(models[0]).toMatchObject({
      modelId: ELSER_MODEL_ID,
      deploymentState: MlModelDeploymentState.NotDeployed,
    });
    expect(mockTrainedModelsProvider.getTrainedModels).toHaveBeenCalledTimes(2);
  });

  it('pins promoted models on top and sorts others by title', async () => {
    const mockModelConfigs = {
      count: 3,
      trained_model_configs: [
        {
          model_id: 'model_1',
          inference_config: {
            ner: {}, // "Named Entity Recognition"
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: 'model_2',
          inference_config: {
            text_embedding: {}, // "Dense Vector Text Embedding"
          },
          input: {
            fields: ['text_field'],
          },
        },
        {
          model_id: 'model_3',
          inference_config: {
            text_classification: {}, // "Text Classification"
          },
          input: {
            fields: ['text_field'],
          },
        },
      ],
    };
    const mockModelStats = {
      trained_model_stats: mockModelConfigs.trained_model_configs.map((modelConfig) => ({
        model_id: modelConfig.model_id,
      })),
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockModelConfigs)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockModelStats)
    );

    const models = await fetchMlModels(
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockLogger
    );

    expect(models.length).toBe(5);
    expect(models[0].modelId).toEqual(ELSER_MODEL_ID); // Pinned to top
    expect(models[1].modelId).toEqual(E5_MODEL_ID); // Pinned to top
    expect(models[2].modelId).toEqual('model_2'); // "Dense Vector Text Embedding"
    expect(models[3].modelId).toEqual('model_1'); // "Named Entity Recognition"
    expect(models[4].modelId).toEqual('model_3'); // "Text Classification"
  });
});
