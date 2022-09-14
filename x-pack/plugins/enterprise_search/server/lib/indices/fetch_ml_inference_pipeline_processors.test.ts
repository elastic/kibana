/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { InferencePipeline } from '@kbn/enterprise-search-plugin/common/types/pipelines';

import {
  fetchAndAddTrainedModelData,
  fetchMlInferencePipelineProcessorNames,
  fetchMlInferencePipelineProcessors,
  fetchPipelineProcessorInferenceData,
} from './fetch_ml_inference_pipeline_processors';

describe('fetchMlInferencePipelineProcessorNames lib function', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return pipeline processor names for the @ml-inference pipeline', async () => {
    const mockGetPipeline = {
      'my-index@ml-inference': {
        id: 'my-index@ml-inference',
        processors: [
          {
            pipeline: {
              name: 'my-ml-pipeline',
            },
          },
        ],
      },
    };

    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline));

    const expected = ['my-ml-pipeline'];

    const response = await fetchMlInferencePipelineProcessorNames(
      mockClient as unknown as ElasticsearchClient,
      'my-index'
    );

    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({ id: 'my-index@ml-inference' });
    expect(response).toEqual(expected);
  });

  it('should return an empty array for a missing @ml-inference pipeline', async () => {
    const mockGetPipeline = {
      'my-index@ml-inference': {
        id: 'my-index@ml-inference',
        processors: [
          {
            pipeline: {
              name: 'my-ml-pipeline',
            },
          },
        ],
      },
    };

    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline));

    const response = await fetchMlInferencePipelineProcessorNames(
      mockClient as unknown as ElasticsearchClient,
      'my-index-without-ml-inference-pipeline'
    );

    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
      id: 'my-index-without-ml-inference-pipeline@ml-inference',
    });
    expect(response).toEqual([]);
  });
});

describe('fetchPipelineProcessorInferenceData lib function', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the inference processor data for the pipelines', async () => {
    const mockGetPipeline = {
      'ml-inference-pipeline-1': {
        id: 'ml-inference-pipeline-1',
        processors: [
          {
            set: {
              description: 'just a set processor for fun',
              field: 'bar-field',
              value: 'bar',
            },
          },
          {
            inference: {
              model_id: 'trained-model-id-1',
              inference_config: { regression: {} },
            },
          },
        ],
      },
      'ml-inference-pipeline-2': {
        id: 'ml-inference-pipeline-2',
        processors: [
          {
            inference: {
              model_id: 'trained-model-id-2',
              inference_config: { regression: {} },
            },
          },
        ],
      },
      'non-ml-inference-pipeline': {
        id: 'non-ml-inference-pipeline',
        processors: [
          {
            pipeline: {
              name: 'different-pipeline',
            },
          },
        ],
      },
    };

    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline));

    const expected = {
      'trained-model-id-1': {
        isDeployed: false,
        modelType: 'unknown',
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
      },
      'trained-model-id-2': {
        isDeployed: false,
        modelType: 'unknown',
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
      },
    };

    const response = await fetchPipelineProcessorInferenceData(
      mockClient as unknown as ElasticsearchClient,
      ['ml-inference-pipeline-1', 'ml-inference-pipeline-2', 'non-ml-inference-pipeline']
    );

    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
      id: 'ml-inference-pipeline-1,ml-inference-pipeline-2,non-ml-inference-pipeline',
    });
    expect(response).toEqual(expected);
  });
});

describe('fetchAndAddTrainedModelData lib function', () => {
  const mockClient = {
    ml: {
      getTrainedModels: jest.fn(),
      getTrainedModelsStats: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update the pipeline processor data with model type of deployment status info', async () => {
    const mockGetTrainedModelsData = {
      count: 1,
      trained_model_configs: [
        {
          model_id: 'trained-model-id-1',
          model_type: 'lang_ident',
        },
        {
          model_id: 'trained-model-id-2',
          model_type: 'pytorch',
        },
      ],
    };

    const mockGetTrainedModelStats = {
      count: 1,
      trained_model_stats: [
        {
          model_id: 'trained-model-id-1',
        },
        {
          model_id: 'trained-model-id-2',
          deployment_stats: {
            state: 'started',
          },
        },
      ],
    };

    mockClient.ml.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelsData)
    );
    mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelStats)
    );

    const input = {
      'trained-model-id-1': {
        isDeployed: false,
        modelType: 'unknown',
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
      },
      'trained-model-id-2': {
        isDeployed: false,
        modelType: 'unknown',
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
      },
    } as Record<string, InferencePipeline>;

    const expected = {
      'trained-model-id-1': {
        isDeployed: false,
        modelType: 'lang_ident',
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
      },
      'trained-model-id-2': {
        isDeployed: true,
        modelType: 'pytorch',
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
      },
    } as Record<string, InferencePipeline>;

    const response = await fetchAndAddTrainedModelData(
      mockClient as unknown as ElasticsearchClient,
      input
    );

    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
      model_id: 'trained-model-id-1,trained-model-id-2',
    });
    expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
      model_id: 'trained-model-id-1,trained-model-id-2',
    });
    expect(response).toEqual(expected);
  });
});
