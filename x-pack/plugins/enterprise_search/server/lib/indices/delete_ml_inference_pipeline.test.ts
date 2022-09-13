/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { deleteMlInferencePipeline } from './delete_ml_inference_pipeline';

describe('deleteMlInferencePipeline lib function', () => {
  const mockClient = {
    ingest: {
      deletePipeline: jest.fn(),
      getPipeline: jest.fn(),
      putPipeline: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const notFoundResponse = { meta: { statusCode: 404 } };

  it('should delete pipeline', async () => {
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
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));
    mockClient.ingest.deletePipeline.mockImplementation(() =>
      Promise.resolve({ acknowledged: true })
    );

    const expectedResponse = { deleted: 'my-ml-pipeline', updated: 'my-index@ml-inference' };

    const response = await deleteMlInferencePipeline(
      'my-index',
      'my-ml-pipeline',
      mockClient as unknown as ElasticsearchClient
    );

    expect(response).toEqual(expectedResponse);

    expect(mockClient.ingest.putPipeline).toHaveBeenCalledWith({
      id: 'my-index@ml-inference',
      processors: [],
    });
    expect(mockClient.ingest.deletePipeline).toHaveBeenCalledWith({
      id: 'my-ml-pipeline',
    });
  });

  it('should succeed when parent pipeline is missing', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject(notFoundResponse));
    mockClient.ingest.deletePipeline.mockImplementation(() =>
      Promise.resolve({ acknowledged: true })
    );

    const expectedResponse = {
      deleted: 'my-ml-pipeline',
    };

    const response = await deleteMlInferencePipeline(
      'my-index',
      'my-ml-pipeline',
      mockClient as unknown as ElasticsearchClient
    );

    expect(response).toEqual(expectedResponse);

    expect(mockClient.ingest.putPipeline).toHaveBeenCalledTimes(0);
    expect(mockClient.ingest.deletePipeline).toHaveBeenCalledWith({
      id: 'my-ml-pipeline',
    });
  });

  it('should fail when pipeline is missing', async () => {
    const mockGetPipeline = {};
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline));
    mockClient.ingest.deletePipeline.mockImplementation(() => Promise.reject(notFoundResponse));

    await expect(
      deleteMlInferencePipeline(
        'my-index',
        'my-ml-pipeline',
        mockClient as unknown as ElasticsearchClient
      )
    ).rejects.toThrow(Error);

    expect(mockClient.ingest.putPipeline).toHaveBeenCalledTimes(0);
    expect(mockClient.ingest.deletePipeline).toHaveBeenCalledWith({
      id: 'my-ml-pipeline',
    });
  });
});
