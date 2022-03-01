/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestMock, routeDependencies, RouterMock } from '../test/helpers';
import { addBasePath } from '../routes/api';
import { registerIndicesRoutes } from '../routes/api/indices';
import {
  createTestIndexResponse,
  createTestIndexState,
  createTestIndexStats,
} from '../test/helpers/indices_fixtures';

describe('[Index management API Routes] fetch indices lib function', () => {
  const router = new RouterMock();

  const getIndices = router.getMockESApiFn('indices.get');
  const getIndicesStats = router.getMockESApiFn('indices.stats');
  const mockRequest: RequestMock = {
    method: 'get',
    path: addBasePath('/indices'),
  };

  beforeAll(() => {
    registerIndicesRoutes({
      ...routeDependencies,
      router,
    });
  });

  test('regular index', async () => {
    getIndices.mockResolvedValue({
      regular_index: createTestIndexState(),
    });
    getIndicesStats.mockResolvedValue({
      indices: {
        regular_index: createTestIndexStats({ uuid: 'regular_index' }),
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: [createTestIndexResponse({ name: 'regular_index', uuid: 'regular_index' })],
    });
  });
  test('index with aliases', async () => {
    getIndices.mockResolvedValue({
      index_with_aliases: createTestIndexState({
        aliases: { test_alias: {}, another_alias: {} },
      }),
    });
    getIndicesStats.mockResolvedValue({
      indices: {
        index_with_aliases: createTestIndexStats({ uuid: 'index_with_aliases' }),
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: [
        createTestIndexResponse({
          aliases: ['test_alias', 'another_alias'],
          name: 'index_with_aliases',
          uuid: 'index_with_aliases',
        }),
      ],
    });
  });
  test('frozen index', async () => {
    getIndices.mockResolvedValue({
      frozen_index: createTestIndexState({
        // @ts-expect-error
        settings: { index: { number_of_shards: 1, number_of_replicas: 1, frozen: 'true' } },
      }),
    });
    getIndicesStats.mockResolvedValue({
      indices: {
        frozen_index: createTestIndexStats({ uuid: 'frozen_index' }),
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: [
        createTestIndexResponse({
          name: 'frozen_index',
          uuid: 'frozen_index',
          isFrozen: true,
        }),
      ],
    });
  });
  test('hidden index', async () => {
    getIndices.mockResolvedValue({
      hidden_index: createTestIndexState({
        settings: { index: { number_of_shards: 1, number_of_replicas: 1, hidden: 'true' } },
      }),
    });
    getIndicesStats.mockResolvedValue({
      indices: {
        hidden_index: createTestIndexStats({ uuid: 'hidden_index' }),
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: [
        createTestIndexResponse({
          name: 'hidden_index',
          uuid: 'hidden_index',
          hidden: true,
        }),
      ],
    });
  });
  test('data stream index', async () => {
    getIndices.mockResolvedValue({
      data_stream_index: createTestIndexState({
        data_stream: 'test_data_stream',
      }),
    });
    getIndicesStats.mockResolvedValue({
      indices: {
        data_stream_index: createTestIndexStats({ uuid: 'data_stream_index' }),
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: [
        createTestIndexResponse({
          name: 'data_stream_index',
          uuid: 'data_stream_index',
          data_stream: 'test_data_stream',
        }),
      ],
    });
  });
  test('index missing in stats call', async () => {
    getIndices.mockResolvedValue({
      index_missing_stats: createTestIndexState(),
    });
    // simulates when an index has been deleted after get indices call
    // deleted index won't be present in the indices stats call response
    getIndicesStats.mockResolvedValue({
      indices: {
        some_other_index: createTestIndexStats({ uuid: 'some_other_index' }),
      },
    });
    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: [
        createTestIndexResponse({
          name: 'index_missing_stats',
          uuid: undefined,
          health: undefined,
          status: undefined,
          documents: 0,
          size: '0b',
          primary_size: '0b',
        }),
      ],
    });
  });
});
