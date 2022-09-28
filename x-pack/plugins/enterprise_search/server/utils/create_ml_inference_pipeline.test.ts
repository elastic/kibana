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
import {
  getInferencePipelineNameFromIndexName,
  getPrefixedInferencePipelineProcessorName,
} from './ml_inference_pipeline_utils';

const mockClient = {
  ingest: {
    getPipeline: jest.fn(),
    putPipeline: jest.fn(),
  },
  ml: {
    getTrainedModels: jest.fn(),
  },
};

describe('createMlInferencePipeline util function', () => {
  const pipelineName = 'my-pipeline';
  const modelId = 'my-model-id';
  const sourceField = 'my-source-field';
  const destinationField = 'my-dest-field';
  const inferencePipelineGeneratedName = getPrefixedInferencePipelineProcessorName(pipelineName);

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
      modelId,
      sourceField,
      destinationField,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual(expectedResult);
    expect(mockClient.ingest.putPipeline).toHaveBeenCalled();
  });

  it('should convert spaces to underscores in the pipeline name', async () => {
    await createMlInferencePipeline(
      'my pipeline with spaces  ',
      modelId,
      sourceField,
      destinationField,
      mockClient as unknown as ElasticsearchClient
    );

    expect(mockClient.ingest.putPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ml-inference-my_pipeline_with_spaces',
      })
    );
  });

  it('should default the destination field to the pipeline name', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject({ statusCode: 404 })); // Pipeline does not exist
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));

    await createMlInferencePipeline(
      pipelineName,
      modelId,
      sourceField,
      undefined, // Omitted destination field
      mockClient as unknown as ElasticsearchClient
    );

    // Verify the object passed to pipeline creation contains the default target field name
    expect(mockClient.ingest.putPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        processors: expect.arrayContaining([
          expect.objectContaining({
            inference: expect.objectContaining({
              target_field: `ml.inference.${pipelineName}`,
            }),
          }),
        ]),
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
      modelId,
      sourceField,
      destinationField,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).rejects.toThrow(Error);
    expect(mockClient.ingest.putPipeline).not.toHaveBeenCalled();
  });
});

describe('addSubPipelineToIndexSpecificMlPipeline util function', () => {
  const indexName = 'my-index';
  const parentPipelineId = getInferencePipelineNameFromIndexName(indexName);
  const pipelineName = 'ml-inference-my-pipeline';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should add the sub-pipeline reference to the parent ML pipeline if it isn't there", async () => {
    mockClient.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve({
        [parentPipelineId]: {
          processors: [],
        },
      })
    );

    const expectedResult = {
      id: pipelineName,
      addedToParentPipeline: true,
    };

    const actualResult = await addSubPipelineToIndexSpecificMlPipeline(
      indexName,
      pipelineName,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual(expectedResult);
    // Verify the parent pipeline was updated with a reference of the sub-pipeline
    expect(mockClient.ingest.putPipeline).toHaveBeenCalledWith({
      id: parentPipelineId,
      processors: expect.arrayContaining([
        {
          pipeline: {
            name: pipelineName,
          },
        },
      ]),
    });
  });

  it('should not add the sub-pipeline reference to the parent ML pipeline if the parent is missing', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject({ statusCode: 404 })); // Pipeline does not exist

    const expectedResult = {
      id: pipelineName,
      addedToParentPipeline: false,
    };

    const actualResult = await addSubPipelineToIndexSpecificMlPipeline(
      indexName,
      pipelineName,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual(expectedResult);
    // Verify the parent pipeline was NOT updated
    expect(mockClient.ingest.putPipeline).not.toHaveBeenCalled();
  });

  it('should not add the sub-pipeline reference to the parent ML pipeline if it is already there', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve({
        [parentPipelineId]: {
          processors: [
            {
              pipeline: {
                name: pipelineName,
              },
            },
          ],
        },
      })
    );

    const expectedResult = {
      id: pipelineName,
      addedToParentPipeline: false,
    };

    const actualResult = await addSubPipelineToIndexSpecificMlPipeline(
      indexName,
      pipelineName,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual(expectedResult);
    // Verify the parent pipeline was NOT updated
    expect(mockClient.ingest.putPipeline).not.toHaveBeenCalled();
  });
});
