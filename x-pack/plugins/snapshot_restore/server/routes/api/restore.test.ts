/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../helpers';
import { registerRestoreRoutes } from './restore';
import { RouterMock, routeDependencies, RequestMock } from '../../test/helpers';

describe('[Snapshot and Restore API Routes] Restore', () => {
  const mockEsShard = {
    type: 'SNAPSHOT',
    source: {},
    target: {},
    index: { size: {}, files: {} },
  };

  const router = new RouterMock();

  beforeAll(() => {
    registerRestoreRoutes({
      ...routeDependencies,
      router,
    });
  });

  /**
   * ES APIs used by these endpoints
   */
  const indicesRecoveryFn = router.getMockApiFn('indices.recovery');
  const restoreSnapshotFn = router.getMockApiFn('snapshot.restore');

  describe('Restore snapshot', () => {
    const mockRequest: RequestMock = {
      method: 'post',
      path: addBasePath('restore/{repository}/{snapshot}'),
      params: {
        repository: 'foo',
        snapshot: 'snapshot-1',
      },
      body: {},
    };

    it('should return successful response from ES', async () => {
      const mockEsResponse = { acknowledged: true };
      restoreSnapshotFn.mockResolvedValue(mockEsResponse);

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: mockEsResponse,
      });
    });

    it('should throw if ES error', async () => {
      restoreSnapshotFn.mockRejectedValue(new Error());
      await expect(router.runRequest(mockRequest)).rejects.toThrowError();
    });
  });

  describe('getAllHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('restores'),
    };

    it('should arrify and filter restore shards returned from ES', async () => {
      const mockEsResponse = {
        fooIndex: {
          shards: [mockEsShard],
        },
        barIndex: {
          shards: [mockEsShard, mockEsShard],
        },
        testIndex: {
          shards: [
            {
              ...mockEsShard,
              type: 'EMPTY_STORE',
            },
          ],
        },
      };

      indicesRecoveryFn.mockResolvedValue(mockEsResponse);

      const expectedResponse = [
        {
          index: 'fooIndex',
          shards: [{}],
          isComplete: false,
          latestActivityTimeInMillis: 0,
        },
        {
          index: 'barIndex',
          shards: [{}, {}],
          isComplete: false,
          latestActivityTimeInMillis: 0,
        },
      ];

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockEsResponse = {};
      indicesRecoveryFn.mockResolvedValue(mockEsResponse);
      const expectedResponse: any[] = [];

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });

    it('should throw if ES error', async () => {
      indicesRecoveryFn.mockRejectedValue(new Error());
      await expect(router.runRequest(mockRequest)).rejects.toThrowError();
    });
  });
});
