/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';

import { ElasticsearchClient } from '@kbn/core/server';

import { getInferencePipelineNameFromIndexName } from '../../utils/ml_inference_pipeline_utils';

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
    created: [indexName, `${indexName}@custom`, getInferencePipelineNameFromIndexName(indexName)],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create the pipelines', async () => {
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));
    await expect(
      createIndexPipelineDefinitions(indexName, mockClient as unknown as ElasticsearchClient)
    ).resolves.toEqual(expectedResult);
    expect(mockClient.ingest.putPipeline).toHaveBeenCalledTimes(3);
  });
});

describe('formatMlPipelineBody util function', () => {
  const pipelineName = 'ml-inference-my-ml-proc';
  const modelId = 'my-model-id';
  const modelInputField = 'my-model-input-field';
  const modelType = 'pytorch';
  const inferenceConfigKey = 'my-model-type';
  const modelTypes = ['pytorch', 'my-model-type'];
  const modelVersion = 3;
  const sourceField = 'my-source-field';
  const destField = 'my-dest-field';

  const expectedResult = {
    description: '',
    processors: [
      {
        remove: {
          field: `ml.inference.${destField}`,
          ignore_missing: true,
        },
      },
      {
        inference: {
          field_map: {
            [sourceField]: modelInputField,
          },
          model_id: modelId,
          target_field: `ml.inference.${destField}`,
          on_failure: [
            {
              append: {
                field: '_source._ingest.inference_errors',
                value: [
                  {
                    pipeline: pipelineName,
                    message: `Processor 'inference' in pipeline '${pipelineName}' failed with message '{{ _ingest.on_failure_message }}'`,
                    timestamp: '{{{ _ingest.timestamp }}}',
                  },
                ],
              },
            },
          ],
        },
      },
      {
        append: {
          field: '_source._ingest.processors',
          value: [
            {
              model_version: modelVersion,
              pipeline: pipelineName,
              processed_timestamp: '{{{ _ingest.timestamp }}}',
              types: modelTypes,
            },
          ],
        },
      },
    ],
    version: 1,
  };

  const mockClient = {
    ml: {
      getTrainedModels: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the pipeline body', async () => {
    const mockResponse = {
      count: 1,
      trained_model_configs: [
        {
          inference_config: {
            [inferenceConfigKey]: {},
          },
          input: { field_names: [modelInputField] },
          model_id: modelId,
          model_type: modelType,
          version: modelVersion,
        },
      ],
    };
    mockClient.ml.getTrainedModels.mockImplementation(() => Promise.resolve(mockResponse));
    const actualResult = await formatMlPipelineBody(
      pipelineName,
      modelId,
      sourceField,
      destField,
      undefined,
      mockClient as unknown as ElasticsearchClient
    );
    expect(actualResult).toEqual(expectedResult);
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(1);
  });

  it('should raise an error if no model found', async () => {
    const mockError = new Error('No known trained model with model_id [my-model-id]');
    mockClient.ml.getTrainedModels.mockImplementation(() => Promise.reject(mockError));
    const asyncCall = formatMlPipelineBody(
      pipelineName,
      modelId,
      sourceField,
      destField,
      undefined,
      mockClient as unknown as ElasticsearchClient
    );
    await expect(asyncCall).rejects.toThrow(Error);
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(1);
  });

  it('should insert a placeholder if model has no input fields', async () => {
    const expectedResultWithNoInputField = merge({}, expectedResult, {
      processors: [
        {}, // append - we'll leave it untouched
        {
          inference: {
            field_map: {
              [sourceField]: 'MODEL_INPUT_FIELD',
            },
          },
        },
      ],
    });

    const mockResponse = {
      count: 1,
      trained_model_configs: [
        {
          inference_config: {
            [inferenceConfigKey]: {},
          },
          input: { field_names: [] },
          model_id: modelId,
          model_type: modelType,
          version: modelVersion,
        },
      ],
    };
    mockClient.ml.getTrainedModels.mockImplementation(() => Promise.resolve(mockResponse));
    const actualResult = await formatMlPipelineBody(
      pipelineName,
      modelId,
      sourceField,
      destField,
      undefined,
      mockClient as unknown as ElasticsearchClient
    );
    expect(actualResult).toEqual(expectedResultWithNoInputField);
    expect(mockClient.ml.getTrainedModels).toHaveBeenCalledTimes(1);
  });
});
