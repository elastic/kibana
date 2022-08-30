/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { createIndexPipelineDefinitions } from './create_pipeline_definitions';

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
