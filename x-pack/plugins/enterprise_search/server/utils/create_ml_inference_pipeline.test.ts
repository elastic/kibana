/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import {
  createMlInferencePipeline,
  addSubPipelineToIndexSpecificMlPipeline,
} from './create_ml_inference_pipeline';

describe('createMlInferencePipeline util function', () => {
  const pipelineName = 'my-pipeline';
  const modelId = 'my-model-id';
  const sourceField = 'my-source-field';
  const destinationField = 'my-dest-field';
  const inferencePipelineGeneratedName = `ml-inference-${pipelineName}`;

  const mockClient = {
    ingest: {
      getPipeline: jest.fn(),
      putPipeline: jest.fn(),
    },
    ml: {
      getTrainedModels: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create the pipeline if it doesn't exist", async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject({ statusCode: 404 })); // Pipeline does not exist
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));
    mockClient.ml.getTrainedModels.mockImplementation(() =>
      Promise.resolve({
        trained_model_configs: [
          {
            input: {
              field_names: ['target-field'],
            },
          },
        ],
      })
    );

    const expectedResult = {
      created: true,
      id: inferencePipelineGeneratedName,
    };

    const actualResult = await createMlInferencePipeline(
      pipelineName,
      modelId,
      sourceField,
      destinationField,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual(expectedResult);
    expect(mockClient.ingest.putPipeline).toHaveBeenCalled();
  });

  it('should throw an error without creating the pipeline if it already exists', () => {
    mockClient.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve({
        [inferencePipelineGeneratedName]: {},
      })
    ); // Pipeline exists

    const actualResult = createMlInferencePipeline(
      pipelineName,
      modelId,
      sourceField,
      destinationField,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual(expectedResult);
    // Verify the parent pipeline was NOT updated
    expect(mockClient.ingest.putPipeline).not.toHaveBeenCalled();
  });
});
