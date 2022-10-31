/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';

import { detachMlInferencePipeline } from './detach_ml_inference_pipeline';

describe('detachMlInferencePipeline', () => {
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

  const anyObject: any = {};
  const notFoundResponse = { meta: { statusCode: 404 } };
  const notFoundError = new errors.ResponseError({
    body: notFoundResponse,
    statusCode: 404,
    headers: {},
    meta: anyObject,
    warnings: [],
  });
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

  it('should update parent pipeline', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.resolve(mockGetPipeline));
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));
    mockClient.ingest.deletePipeline.mockImplementation(() =>
      Promise.resolve({ acknowledged: true })
    );

    const expectedResponse = { updated: 'my-index@ml-inference' };

    const response = await detachMlInferencePipeline(
      'my-index',
      'my-ml-pipeline',
      mockClient as unknown as ElasticsearchClient
    );

    expect(response).toEqual(expectedResponse);

    expect(mockClient.ingest.putPipeline).toHaveBeenCalledWith({
      id: 'my-index@ml-inference',
      processors: [],
    });
    expect(mockClient.ingest.deletePipeline).not.toHaveBeenCalledWith({
      id: 'my-ml-pipeline',
    });
  });

  it('should only remove provided pipeline from parent', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() =>
      Promise.resolve({
        'my-index@ml-inference': {
          id: 'my-index@ml-inference',
          processors: [
            {
              pipeline: {
                name: 'my-ml-pipeline',
              },
            },
            {
              pipeline: {
                name: 'my-ml-other-pipeline',
              },
            },
          ],
        },
      })
    );
    mockClient.ingest.putPipeline.mockImplementation(() => Promise.resolve({ acknowledged: true }));
    mockClient.ingest.deletePipeline.mockImplementation(() =>
      Promise.resolve({ acknowledged: true })
    );

    const expectedResponse = { updated: 'my-index@ml-inference' };

    const response = await detachMlInferencePipeline(
      'my-index',
      'my-ml-pipeline',
      mockClient as unknown as ElasticsearchClient
    );

    expect(response).toEqual(expectedResponse);

    expect(mockClient.ingest.putPipeline).toHaveBeenCalledWith({
      id: 'my-index@ml-inference',
      processors: [
        {
          pipeline: {
            name: 'my-ml-other-pipeline',
          },
        },
      ],
    });
    expect(mockClient.ingest.deletePipeline).not.toHaveBeenCalledWith({
      id: 'my-ml-pipeline',
    });
  });

  it('should fail when parent pipeline is missing', async () => {
    mockClient.ingest.getPipeline.mockImplementation(() => Promise.reject(notFoundError));

    await expect(
      detachMlInferencePipeline(
        'my-index',
        'my-ml-pipeline',
        mockClient as unknown as ElasticsearchClient
      )
    ).rejects.toThrow(Error);

    expect(mockClient.ingest.getPipeline).toHaveBeenCalledWith({
      id: 'my-index@ml-inference',
    });
  });
});
