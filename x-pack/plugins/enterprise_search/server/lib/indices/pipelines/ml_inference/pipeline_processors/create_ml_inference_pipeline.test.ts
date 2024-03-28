/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { getPrefixedInferencePipelineProcessorName } from '../../../../../utils/ml_inference_pipeline_utils';

import { createMlInferencePipeline } from './create_ml_inference_pipeline';

const mockClient = {
  ingest: {
    getPipeline: jest.fn(),
    putPipeline: jest.fn(),
  },
  ml: {
    getTrainedModels: jest.fn(),
  },
};

describe('createMlInferencePipeline lib function', () => {
  const pipelineName = 'my-pipeline';
  const pipelineDefinition = { processors: [] };
  const inferencePipelineGeneratedName = getPrefixedInferencePipelineProcessorName(pipelineName);

  mockClient.ml.getTrainedModels.mockImplementation(() =>
    Promise.resolve({
      trained_model_configs: [
        {
          inference_config: {
            ner: {},
          },
          input: {
            field_names: ['target-field'],
          },
        },
      ],
    })
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create the pipeline if it doesn't exist", async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject({ statusCode: 404 })); // Pipeline does not exist
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));

    const expectedResult = {
      created: true,
      id: inferencePipelineGeneratedName,
    };

    const actualResult = await createMlInferencePipeline(
      pipelineName,
      // @ts-expect-error pipeline._meta defined as mandatory
      pipelineDefinition,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual(expectedResult);
    expect(mockClient.ingest.putPipeline).toHaveBeenCalled();
  });

  it('should convert spaces to underscores in the pipeline name', async () => {
    await createMlInferencePipeline(
      'my pipeline with spaces  ',
      // @ts-expect-error pipeline._meta defined as mandatory
      pipelineDefinition,
      mockClient as unknown as ElasticsearchClient
    );

    expect(mockClient.ingest.putPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ml-inference-my_pipeline_with_spaces',
      })
    );
  });

  it('should throw an error without creating the pipeline if it already exists', () => {
    mockClient.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve({
        [inferencePipelineGeneratedName]: {},
      })
    ); // Pipeline exists

    const actualResult = createMlInferencePipeline(
      pipelineName,
      // @ts-expect-error pipeline._meta defined as mandatory
      pipelineDefinition,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).rejects.toThrow(Error);
    expect(mockClient.ingest.putPipeline).not.toHaveBeenCalled();
  });
});
