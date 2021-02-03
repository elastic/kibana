/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { getSignalVersionsByIndex } from './get_signal_versions_by_index';

describe('getSignalVersionsByIndex', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('properly transforms the elasticsearch aggregation', async () => {
    // @ts-expect-error mocking only what we need
    esClient.search.mockResolvedValueOnce({
      body: {
        aggregations: {
          signals_indices: {
            buckets: [
              {
                key: 'index1',
                signal_versions: {
                  buckets: [
                    { key: 1, doc_count: 2 },
                    { key: 2, doc_count: 3 },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    const result = await getSignalVersionsByIndex({
      esClient,
      index: ['index1', 'index2'],
    });

    expect(result).toEqual({
      index1: [
        { count: 2, version: 1 },
        { count: 3, version: 2 },
      ],
      index2: [],
    });
  });
});
