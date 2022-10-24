/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { addSubPipelineToIndexSpecificMlPipeline } from './create_ml_inference_pipeline';
import { getInferencePipelineNameFromIndexName } from './ml_inference_pipeline_utils';

const mockClient = {
  ingest: {
    getPipeline: jest.fn(),
    putPipeline: jest.fn(),
  },
  ml: {
    getTrainedModels: jest.fn(),
  },
};

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
      addedToParentPipeline: true,
      id: pipelineName,
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
      addedToParentPipeline: false,
      id: pipelineName,
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
      addedToParentPipeline: false,
      id: pipelineName,
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
