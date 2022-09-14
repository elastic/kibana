/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { simulatePipeline } from './simulate_pipeline';

describe('simulatePipeline lib function', () => {
  const mockClient = {
    ingest: {
      simulate: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const pipelineBody = {
    description: 'My pipeline',
    processors: [
      {
        set: {
          field: 'my_field',
          value: 'my value',
        },
      },
    ],
  };
  const documents = [
    {
      _id: '1',
      _index: 'my-index',
      _source: {
        my_other_field: 'my other value',
      },
    },
  ];

  it('should simulate pipeline', async () => {
    const mockResponse = { mockKey: 'mockValue' };

    mockClient.ingest.simulate.mockImplementation(() => mockResponse);

    await expect(
      simulatePipeline(pipelineBody, documents, mockClient as unknown as ElasticsearchClient)
    ).resolves.toEqual(mockResponse);
    expect(mockClient.ingest.simulate).toHaveBeenCalledWith({
      docs: documents,
      pipeline: pipelineBody,
    });
  });
});
