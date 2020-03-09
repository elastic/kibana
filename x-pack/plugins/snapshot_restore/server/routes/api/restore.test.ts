/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  const router = new RouterMock('snapshotRestore.client');

  beforeAll(() => {
    registerRestoreRoutes({
      router: router as any,
      ...routeDependencies,
    });
  });

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
      router.callAsCurrentUserResponses = [mockEsResponse];

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: mockEsResponse,
      });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(new Error())];
      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
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

      router.callAsCurrentUserResponses = [mockEsResponse];

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
      router.callAsCurrentUserResponses = [mockEsResponse];
      const expectedResponse: any[] = [];

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(new Error())];
      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });
});
