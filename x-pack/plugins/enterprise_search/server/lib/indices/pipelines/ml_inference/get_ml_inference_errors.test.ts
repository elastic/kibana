/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { getMlInferenceErrors } from './get_ml_inference_errors';

describe('getMlInferenceErrors', () => {
  const indexName = 'my-index';

  const mockClient = {
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch aggregations and transform them', async () => {
    mockClient.search.mockImplementation(() =>
      Promise.resolve({
        aggregations: {
          errors: {
            buckets: [
              {
                key: 'Error message 1',
                doc_count: 100,
                max_error_timestamp: {
                  value: 1664977836100,
                  value_as_string: '2022-10-05T13:50:36.100Z',
                },
              },
              {
                key: 'Error message 2',
                doc_count: 200,
                max_error_timestamp: {
                  value: 1664977836200,
                  value_as_string: '2022-10-05T13:50:36.200Z',
                },
              },
            ],
          },
        },
      })
    );

    const actualResult = await getMlInferenceErrors(
      indexName,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual([
      {
        message: 'Error message 1',
        doc_count: 100,
        timestamp: '2022-10-05T13:50:36.100Z',
      },
      {
        message: 'Error message 2',
        doc_count: 200,
        timestamp: '2022-10-05T13:50:36.200Z',
      },
    ]);
    expect(mockClient.search).toHaveBeenCalledTimes(1);
  });

  it('should return an empty array if there are no aggregates', async () => {
    mockClient.search.mockImplementation(() =>
      Promise.resolve({
        aggregations: {
          errors: [],
        },
      })
    );

    const actualResult = await getMlInferenceErrors(
      indexName,
      mockClient as unknown as ElasticsearchClient
    );

    expect(actualResult).toEqual([]);
  });
});
