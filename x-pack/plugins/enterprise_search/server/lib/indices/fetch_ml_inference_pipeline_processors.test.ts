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

import {
  fetchAndAddTrainedModelData,
  getMlModelTypesForModelConfig,
  getMlModelConfigsForModelIds,
  fetchMlInferencePipelineProcessorNames,
  fetchMlInferencePipelineProcessors,
  fetchPipelineProcessorInferenceData,
  InferencePipelineData,
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

const mockMultiPipeline = {
  'my-index@ml-inference': {
    id: 'my-index@ml-inference',
    processors: [
      {
        pipeline: {
          name: 'ml-inference-pipeline-1',
        },
      },
      {
        pipeline: {
          name: 'ml-inference-pipeline-3',
        },
      },
    ],
  },
};

const mockGetPipeline3 = {
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
  'ml-inference-pipeline-3': {
    id: 'ml-inference-pipeline-3',
    processors: [
      {
        set: {
          description: 'just a set processor for fun',
          field: 'foo-field',
          value: 'foo',
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
    {
      inference_config: { text_classification: {} },
      model_id: 'trained-model-id-3',
      model_type: 'pytorch',
      tags: [],
    },
    {
      inference_config: { fill_mask: {} },
      model_id: 'trained-model-id-4',
      model_type: 'pytorch',
      tags: [],
    },
  ],
};

const mockGetTrainedModelStats = {
  count: 4,
  trained_model_stats: [
    {
      model_id: 'trained-model-id-1',
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
        },
        state: 'started',
      },
      model_id: 'trained-model-id-2',
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
        },
        state: 'failed',
        reason: 'something is wrong, boom',
      },
      model_id: 'trained-model-id-3',
    },
    {
      deployment_stats: {
        allocation_status: {
          allocation_count: 1,
        },
        state: 'starting',
      },
      model_id: 'trained-model-id-4',
    },
  ],
};

const trainedModelDataObject: Record<string, InferencePipeline> = {
  'trained-model-id-1': {
    modelState: TrainedModelState.NotDeployed,
    pipelineName: 'ml-inference-pipeline-1',
    types: ['lang_ident', 'ner'],
  },
  'trained-model-id-2': {
    modelState: TrainedModelState.Started,
    pipelineName: 'ml-inference-pipeline-2',
    types: ['pytorch', 'ner'],
  },
  'ml-inference-pipeline-3': {
    modelState: TrainedModelState.NotDeployed,
    pipelineName: 'ml-inference-pipeline-3',
    types: ['lang_ident', 'ner'],
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

    const expected: InferencePipelineData[] = [
      {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
        types: [],
      },
      {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
        types: [],
      },
    ];

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

describe('getMlModelTypesForModelConfig lib function', () => {
  const mockModel: MlTrainedModelConfig = {
    inference_config: {
      ner: {},
    },
    input: {
      field_names: [],
    },
    model_id: 'test_id',
    model_type: 'pytorch',
    tags: ['test_tag'],
  };
  const builtInMockModel: MlTrainedModelConfig = {
    inference_config: {
      text_classification: {},
    },
    input: {
      field_names: [],
    },
    model_id: 'test_id',
    model_type: 'lang_ident',
    tags: [BUILT_IN_MODEL_TAG],
  };

  it('should return the model type and inference config type', () => {
    const expected = ['pytorch', 'ner'];
    const response = getMlModelTypesForModelConfig(mockModel);
    expect(response.sort()).toEqual(expected.sort());
  });

  it('should include the built in type', () => {
    const expected = ['lang_ident', 'text_classification', BUILT_IN_MODEL_TAG];
    const response = getMlModelTypesForModelConfig(builtInMockModel);
    expect(response.sort()).toEqual(expected.sort());
  });
});

describe('getMlModelConfigsForModelIds lib function', () => {
  const mockClient = {
    ml: {
      getTrainedModels: jest.fn(),
      getTrainedModelsStats: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the models that we ask for', async () => {
    mockClient.ml.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelsData)
    );
    mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockGetTrainedModelStats)
    );

    const input: Record<string, InferencePipelineData> = {
      'trained-model-id-1': {
        modelState: TrainedModelState.Started,
        pipelineName: '',
        trainedModelName: 'trained-model-id-1',
        types: ['pytorch', 'ner'],
      },
      'trained-model-id-2': {
        modelState: TrainedModelState.Started,
        pipelineName: '',
        trainedModelName: 'trained-model-id-2',
        types: ['pytorch', 'ner'],
      },
    };

    const expected = {
      'trained-model-id-2': input['trained-model-id-2'],
    };
    const response = await getMlModelConfigsForModelIds(
      mockClient as unknown as ElasticsearchClient,
      ['trained-model-id-2']
    );
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
      model_id: 'trained-model-id-2',
    });
    expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
      model_id: 'trained-model-id-2',
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

    const pipelines: InferencePipelineData[] = [
      {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
        types: [],
      },
      {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
        types: [],
      },
      {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-3',
        trainedModelName: 'trained-model-id-3',
        types: [],
      },
      {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-4',
        trainedModelName: 'trained-model-id-4',
        types: [],
      },
    ];

    const expected: InferencePipelineData[] = [
      {
        modelState: TrainedModelState.NotDeployed,
        pipelineName: 'ml-inference-pipeline-1',
        trainedModelName: 'trained-model-id-1',
        types: ['lang_ident', 'ner'],
      },
      {
        modelState: TrainedModelState.Started,
        pipelineName: 'ml-inference-pipeline-2',
        trainedModelName: 'trained-model-id-2',
        types: ['pytorch', 'ner'],
      },
      {
        modelState: TrainedModelState.Failed,
        modelStateReason: 'something is wrong, boom',
        pipelineName: 'ml-inference-pipeline-3',
        trainedModelName: 'trained-model-id-3',
        types: ['pytorch', 'text_classification'],
      },
      {
        modelState: TrainedModelState.Starting,
        pipelineName: 'ml-inference-pipeline-4',
        trainedModelName: 'trained-model-id-4',
        types: ['pytorch', 'fill_mask'],
      },
    ];

    const response = await fetchAndAddTrainedModelData(
      mockClient as unknown as ElasticsearchClient,
      pipelines
    );

    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledWith({
      model_id: 'trained-model-id-1,trained-model-id-2,trained-model-id-3,trained-model-id-4',
    });
    expect(mockClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
      model_id: 'trained-model-id-1,trained-model-id-2,trained-model-id-3,trained-model-id-4',
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
    it('should return pipeline processors that use same model data for that pipeline', async () => {
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve(mockMultiPipeline)
      );
      mockClient.ingest.getPipeline.mockImplementationOnce(() =>
        Promise.resolve({
          'ml-inference-pipeline-1': mockGetPipeline3['ml-inference-pipeline-1'],
          'ml-inference-pipeline-3': mockGetPipeline3['ml-inference-pipeline-3'],
        })
      );
      mockClient.ml.getTrainedModels.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelsData)
      );
      mockClient.ml.getTrainedModelsStats.mockImplementation(() =>
        Promise.resolve(mockGetTrainedModelStats)
      );

      const expected: InferencePipeline[] = [
        trainedModelDataObject['trained-model-id-1'],
        trainedModelDataObject['ml-inference-pipeline-3'],
      ];

      const response = await fetchMlInferencePipelineProcessors(
        mockClient as unknown as ElasticsearchClient,
        'my-index'
      );

      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'my-index@ml-inference',
      });
      expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'ml-inference-pipeline-1,ml-inference-pipeline-3',
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
