/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { createIndexPipelineDefinitions } from './create_pipeline_definitions';
import { formatMlPipelineBody } from './create_pipeline_definitions';

describe('createIndexPipelineDefinitions util function', () => {
  const indexName = 'my-index';

  const mockClient = {
    ingest: {
      putPipeline: jest.fn(),
    },
  };

  const expectedResult = {
    created: [indexName, `${indexName}@custom`, `${indexName}@ml-inference`],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create the pipelines', () => {
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));
    expect(
      createIndexPipelineDefinitions(indexName, mockClient as unknown as ElasticsearchClient)
    ).toEqual(expectedResult);
    expect(mockClient.ingest.putPipeline).toHaveBeenCalledTimes(3);
  });
});

describe('formatMlPipelineBody util function', () => {
  const modelId = 'my-model-id';
  let modelInputField = 'my-model-input-field';
  const modelType = 'my-model-type';
  const modelVersion = 3;
  const sourceField = 'my-source-field';
  const destField = 'my-dest-field';

  const mockClient = {
    ml: {
      getTrainedModels: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the pipeline body', async () => {
    const expectedResult = {
      description: '',
      version: 1,
      processors: [
        {
          remove: {
            field: `ml.inference.${destField}`,
            ignore_missing: true,
          },
        },
        {
          inference: {
            model_id: modelId,
            target_field: `ml.inference.${destField}`,
            field_map: {
              sourceField: modelInputField,
            },
          },
        },
        {
          append: {
            field: '_source._ingest.processors',
            value: [
              {
                type: modelType,
                model_id: modelId,
                model_version: modelVersion,
                processed_timestamp: '{{{ _ingest.timestamp }}}',
              },
            ],
          },
        },
      ],
    };

    const mockResponse = {
      count: 1,
      trained_model_configs: [
        {
          model_id: modelId,
          version: modelVersion,
          model_type: modelType,
          input: { field_names: [modelInputField] },
        },
      ],
    };
    mockClient.ml.getTrainedModels.mockImplementation(() => Promise.resolve(mockResponse));
    const actualResult = await formatMlPipelineBody(
      modelId,
      sourceField,
      destField,
      mockClient as unknown as ElasticsearchClient
    );
    expect(actualResult).toEqual(expectedResult);
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(1);
  });

  it('should raise an error if no model found', async () => {
    const mockResponse = {
      error: {
        root_cause: [
          {
            type: 'resource_not_found_exception',
            reason: 'No known trained model with model_id [my-model-id]',
          },
        ],
        type: 'resource_not_found_exception',
        reason: 'No known trained model with model_id [my-model-id]',
      },
      status: 404,
    };
    mockClient.ml.getTrainedModels.mockImplementation(() => Promise.resolve(mockResponse));
    const asyncCall = formatMlPipelineBody(
      modelId,
      sourceField,
      destField,
      mockClient as unknown as ElasticsearchClient
    );
    await expect(asyncCall).rejects.toThrow(Error);
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(1);
  });

  it('should insert a placeholder if model has no input fields', async () => {
    modelInputField = 'MODEL_INPUT_FIELD';
    const expectedResult = {
      description: '',
      version: 1,
      processors: [
        {
          remove: {
            field: `ml.inference.${destField}`,
            ignore_missing: true,
          },
        },
        {
          inference: {
            model_id: modelId,
            target_field: `ml.inference.${destField}`,
            field_map: {
              sourceField: modelInputField,
            },
          },
        },
        {
          append: {
            field: '_source._ingest.processors',
            value: [
              {
                type: modelType,
                model_id: modelId,
                model_version: modelVersion,
                processed_timestamp: '{{{ _ingest.timestamp }}}',
              },
            ],
          },
        },
      ],
    };
    const mockResponse = {
      count: 1,
      trained_model_configs: [
        {
          model_id: modelId,
          version: modelVersion,
          model_type: modelType,
          input: { field_names: [] },
        },
      ],
    };
    mockClient.ml.getTrainedModels.mockImplementation(() => Promise.resolve(mockResponse));
    const actualResult = await formatMlPipelineBody(
      modelId,
      sourceField,
      destField,
      mockClient as unknown as ElasticsearchClient
    );
    expect(actualResult).toEqual(expectedResult);
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(1);
  });
});
