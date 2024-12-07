/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getOldestSignalTimestamp } from './get_oldest_signal_timestamp';
import { loggerMock } from '@kbn/logging-mocks';

describe('getOldestSignalTimestamp', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const logger = loggerMock.create();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('get timestamp value from search results', async () => {
    esClient.search.mockResponseOnce(
      // @ts-expect-error mocking only what we need
      {
        aggregations: {
          min_timestamp: {
            value: 1583193600000,
            value_as_string: '2020-03-03T00:00:00.000Z',
          },
        },
      }
    );

    const result = await getOldestSignalTimestamp({
      esClient,
      logger,
      index: ['index1'],
    });

    expect(result).toBe('2020-03-03T00:00:00.000Z');
  });
});
