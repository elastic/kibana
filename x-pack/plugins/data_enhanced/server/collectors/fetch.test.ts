/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SharedGlobalConfig,
  ElasticsearchClient,
  SavedObjectsErrorHelpers,
  Logger,
} from '../../../../../src/core/server';
import { BehaviorSubject } from 'rxjs';
import { fetchProvider } from './fetch';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';

describe('fetchProvider', () => {
  let fetchFn: any;
  let esClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: Logger;

  beforeEach(async () => {
    const config$ = new BehaviorSubject<SharedGlobalConfig>({
      kibana: {
        index: '123',
      },
    } as any);
    mockLogger = {
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    fetchFn = fetchProvider(config$, mockLogger);
  });

  test('returns when ES returns no results', async () => {
    esClient.search.mockResolvedValue({
      statusCode: 200,
      body: {
        aggregations: {
          persisted: {
            buckets: [],
          },
        },
      },
    } as any);

    const collRes = await fetchFn({ esClient });
    expect(collRes.transientCount).toBe(0);
    expect(collRes.persistedCount).toBe(0);
    expect(collRes.totalCount).toBe(0);
    expect(mockLogger.warn).not.toBeCalled();
  });

  test('returns when ES throws an error', async () => {
    esClient.search.mockRejectedValue(
      SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b')
    );

    const collRes = await fetchFn({ esClient });
    expect(collRes.transientCount).toBe(0);
    expect(collRes.persistedCount).toBe(0);
    expect(collRes.totalCount).toBe(0);
    expect(mockLogger.warn).toBeCalledTimes(1);
  });

  test('returns when ES returns full buckets', async () => {
    esClient.search.mockResolvedValue({
      statusCode: 200,
      body: {
        aggregations: {
          persisted: {
            buckets: [
              {
                key_as_string: 'true',
                doc_count: 10,
              },
              {
                key_as_string: 'false',
                doc_count: 7,
              },
            ],
          },
        },
      },
    } as any);

    const collRes = await fetchFn({ esClient });
    expect(collRes.transientCount).toBe(7);
    expect(collRes.persistedCount).toBe(10);
    expect(collRes.totalCount).toBe(17);
  });
});
