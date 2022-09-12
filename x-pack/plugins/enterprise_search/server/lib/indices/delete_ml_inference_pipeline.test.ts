/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { deleteMlInferencePipeline } from './delete_ml_inference_pipeline';

describe('deleteMlInferencePipeline lib function', () => {
  const mockClient = {
    asCurrentUser: {
      ingest: {
        deletePipeline: jest.fn(),
        getPipeline: jest.fn(),
        putPipeline: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    mockClient.asCurrentUser.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve(mockGetPipeline)
    );
    mockClient.asCurrentUser.ingest.putPipeline.mockImplementation(() =>
      Promise.resolve({ acknowledged: true })
    );
    mockClient.asCurrentUser.ingest.deletePipeline.mockImplementation(() =>
      Promise.resolve({ acknowledged: true })
    );

    const expectedResponse = { deleted: 'my-ml-pipeline', updated: 'my-index@ml-inference' };

    const response = await deleteMlInferencePipeline(
      mockClient as unknown as IScopedClusterClient,
      'my-index',
      'my-ml-pipeline'
    );

    expect(response).toEqual(expectedResponse);

    expect(mockClient.asCurrentUser.ingest.putPipeline).toHaveBeenCalledWith({
      id: 'my-index@ml-inference',
      processors: [],
    });
    expect(mockClient.asCurrentUser.ingest.deletePipeline).toHaveBeenCalledWith({
      id: 'my-ml-pipeline',
    });
  });
});
