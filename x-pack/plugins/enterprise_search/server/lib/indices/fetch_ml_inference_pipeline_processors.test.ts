/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { InferencePipeline } from '../../../common/types/pipelines';

import {
  fetchAndAddTrainedModelData,
  fetchMlInferencePipelineProcessorNames,
  fetchMlInferencePipelineProcessors,
  fetchPipelineProcessorInferenceData,
} from './fetch_ml_inference_pipeline_processors';

const mockGetPipeline = {
  'my-index@ml-inference': {
    id: 'my-index@ml-inference',
    processors: [
      {
        pipeline: {
          name: 'ml-inference-pipeline-1',
        },
      },
    ],
  },
};

const mockGetPipeline2 = {
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
          inference_config: { regression: {} },
          model_id: 'trained-model-id-1',
        },
      },
    ],
  },
  'ml-inference-pipeline-2': {
    id: 'ml-inference-pipeline-2',
    processors: [
      {
        inference: {
          inference_config: { regression: {} },
          model_id: 'trained-model-id-2',
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

const mockGetTrainedModelsData = {
  count: 1,
  trained_model_configs: [
    {
      inference_config: { ner: {} },
      model_id: 'trained-model-id-1',
      model_type: 'lang_ident',
      tags: [],
    },
    {
      inference_config: { ner: {} },
      model_id: 'trained-model-id-2',
      model_type: 'pytorch',
      tags: [],
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
      deployment_stats: {
        state: 'started',
      },
      model_id: 'trained-model-id-2',
    },
  ],
};

const trainedModelDataObject = {
  'trained-model-id-1': {
    isDeployed: false,
    pipelineName: 'ml-inference-pipeline-1',
    trainedModelName: 'trained-model-id-1',
    types: ['lang_ident', 'ner'],
  },
  'trained-model-id-2': {
    isDeployed: true,
    pipelineName: 'ml-inference-pipeline-2',
    trainedModelName: 'trained-model-id-2',
    types: ['pytorch', 'ner'],
  },
};

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
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline));

    const expected = ['ml-inference-pipeline-1'];

    const response = await fetchMlInferencePipelineProcessorNames(
      mockClient as unknown as ElasticsearchClient,
      'my-index'
    );

    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({ id: 'my-index@ml-inference' });
    expect(response).toEqual(expected);
  });

  it('should return an empty array for a missing @ml-inference pipeline', async () => {
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
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline2));

    const expected = {
      'trained-model-id-1': {
        isDeployed: false,
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
        types: [],
      },
      'trained-model-id-2': {
        isDeployed: false,
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
        types: [],
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
    mockClient.ml.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelsData)
    );
    mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelStats)
    );

    const input = {
      'trained-model-id-1': {
        isDeployed: false,
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
        types: [],
      },
      'trained-model-id-2': {
        isDeployed: false,
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
        types: [],
      },
    } as Record<string, InferencePipeline>;

    const expected = trainedModelDataObject as Record<string, InferencePipeline>;

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

describe('fetchMlInferencePipelineProcessors lib function', () => {
  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
    },
    ml: {
      getTrainedModels: jest.fn(),
      getTrainedModelsStats: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when using an index that does not have an ml-inference pipeline', () => {
    it('should return an empty array', async () => {
      mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject({}));

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        'index-with-no-ml-inference-pipeline'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'index-with-no-ml-inference-pipeline@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledTimes(1);
      expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(0);
      expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledTimes(0);

      expect(response).toEqual([]);
    });
  });

  describe('when using an index that has an ml-inference pipeline but not inference processors', () => {
    it('should return an empty array', async () => {
      mockClient.ingest.getPipeline.mockImplementationOnce(() => Promise.resolve(mockGetPipeline));
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve({
          'non-ml-inference-pipeline': mockGetPipeline2['non-ml-inference-pipeline'],
        })
      );

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        'my-index'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'my-index@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'ml-inference-pipeline-1',
      });
      expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(0);
      expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledTimes(0);

      expect(response).toEqual([]);
    });
  });

  describe('when using an index that has an ml-inference pipeline', () => {
    it('should return pipeline processor data for that pipeline', async () => {
      mockClient.ingest.getPipeline.mockImplementationOnce(() => Promise.resolve(mockGetPipeline));
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve({ 'ml-inference-pipeline-1': mockGetPipeline2['ml-inference-pipeline-1'] })
      );
      mockClient.ml.getTrainedModels.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelsData)
      );
      mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelStats)
      );

      const expected = [trainedModelDataObject['trained-model-id-1']] as InferencePipeline[];

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        'my-index'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'my-index@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'ml-inference-pipeline-1',
      });
      expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
        model_id: 'trained-model-id-1',
      });
      expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
        model_id: 'trained-model-id-1',
      });

      expect(response).toEqual(expected);
    });
  });
});
