/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

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
      mockClient as unknown as IScopedClusterClient,
      'my-index'
    );

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
      mockClient as unknown as IScopedClusterClient,
      'my-index-without-ml-inference-pipeline'
    );

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
      mockClient as unknown as IScopedClusterClient,
      ['ml-inference-pipeline-1', 'ml-inference-pipeline-2', 'non-ml-inference-pipeline']
    );

    expect(response).toEqual(expected);
  });
});
