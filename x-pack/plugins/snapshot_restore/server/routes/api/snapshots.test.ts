/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addBasePath } from '../helpers';
import { registerSnapshotsRoutes } from './snapshots';
import { RouterMock, routeDependencies, RequestMock } from '../../test/helpers';

const defaultSnapshot = {
  repository: undefined,
  snapshot: undefined,
  uuid: undefined,
  versionId: undefined,
  version: undefined,
  indices: [],
  dataStreams: [],
  includeGlobalState: undefined,
  state: undefined,
  startTime: undefined,
  startTimeInMillis: undefined,
  endTime: undefined,
  endTimeInMillis: undefined,
  durationInMillis: undefined,
  indexFailures: [],
  shards: undefined,
};

describe('[Snapshot and Restore API Routes] Snapshots', () => {
  const router = new RouterMock('snapshotRestore.client');

  beforeAll(() => {
    registerSnapshotsRoutes({
      router: router as any,
      ...routeDependencies,
    });
  });

  describe('getAllHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('snapshots'),
    };

    const mockSnapshotGetManagedRepositoryEsResponse = {
      defaults: {
        'cluster.metadata.managed_repository': 'myManagedRepository',
      },
    };

    test('combines snapshots and their repositories returned from ES', async () => {
      const mockSnapshotGetPolicyEsResponse = {
        fooPolicy: {},
      };

      const mockSnapshotGetRepositoryEsResponse = {
        fooRepository: {},
        barRepository: {},
      };

      const mockGetSnapshotsFooResponse = Promise.resolve({
        responses: [
          {
            repository: 'fooRepository',
            snapshots: [{ snapshot: 'snapshot1' }],
          },
        ],
      });

      const mockGetSnapshotsBarResponse = Promise.resolve({
        responses: [
          {
            repository: 'barRepository',
            snapshots: [{ snapshot: 'snapshot2' }],
          },
        ],
      });

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockSnapshotGetPolicyEsResponse,
        mockSnapshotGetRepositoryEsResponse,
        mockGetSnapshotsFooResponse,
        mockGetSnapshotsBarResponse,
      ];

      const expectedResponse = {
        errors: {},
        repositories: ['fooRepository', 'barRepository'],
        policies: ['fooPolicy'],
        snapshots: [
          {
            ...defaultSnapshot,
            repository: 'fooRepository',
            snapshot: 'snapshot1',
            managedRepository:
              mockSnapshotGetManagedRepositoryEsResponse.defaults[
                'cluster.metadata.managed_repository'
              ],
          },
          {
            ...defaultSnapshot,
            repository: 'barRepository',
            snapshot: 'snapshot2',
            managedRepository:
              mockSnapshotGetManagedRepositoryEsResponse.defaults[
                'cluster.metadata.managed_repository'
              ],
          },
        ],
      };

      const response = await router.runRequest(mockRequest);
      expect(response).toEqual({ body: expectedResponse });
    });

    test('returns empty arrays if no snapshots returned from ES', async () => {
      const mockSnapshotGetPolicyEsResponse = {};
      const mockSnapshotGetRepositoryEsResponse = {};

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockSnapshotGetPolicyEsResponse,
        mockSnapshotGetRepositoryEsResponse,
      ];

      const expectedResponse = {
        errors: [],
        snapshots: [],
        repositories: [],
        policies: [],
      };

      const response = await router.runRequest(mockRequest);
      expect(response).toEqual({ body: expectedResponse });
    });

    test('throws if ES error', async () => {
      router.callAsCurrentUserResponses = [
        jest.fn().mockRejectedValueOnce(new Error('Error getting managed repository')),
        jest.fn().mockRejectedValueOnce(new Error('Error getting policies')),
        jest.fn().mockRejectedValueOnce(new Error('Error getting repository')),
      ];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('getOneHandler()', () => {
    const repository = 'fooRepository';
    const snapshot = 'snapshot1';

    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('snapshots/{repository}/{snapshot}'),
      params: {
        repository,
        snapshot,
      },
    };

    const mockSnapshotGetManagedRepositoryEsResponse = {
      defaults: {
        'cluster.metadata.managed_repository': 'myManagedRepository',
      },
    };

    test('returns snapshot object with repository name if returned from ES', async () => {
      const mockSnapshotGetEsResponse = {
        responses: [
          {
            repository,
            snapshots: [{ snapshot }],
          },
        ],
      };

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockSnapshotGetEsResponse,
      ];

      const expectedResponse = {
        ...defaultSnapshot,
        snapshot,
        repository,
        managedRepository:
          mockSnapshotGetManagedRepositoryEsResponse.defaults[
            'cluster.metadata.managed_repository'
          ],
      };

      const response = await router.runRequest(mockRequest);
      expect(response).toEqual({ body: expectedResponse });
    });

    test('throws if ES error', async () => {
      const mockSnapshotGetEsResponse = {
        responses: [
          {
            repository,
            error: {
              root_cause: [
                {
                  type: 'snapshot_missing_exception',
                  reason: `[${repository}:${snapshot}] is missing`,
                },
              ],
              type: 'snapshot_missing_exception',
              reason: `[${repository}:${snapshot}] is missing`,
            },
          },
        ],
      };

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockSnapshotGetEsResponse,
      ];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('deleteHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'post',
      path: addBasePath('snapshots/bulk_delete'),
      body: [
        {
          repository: 'fooRepository',
          snapshot: 'snapshot-1',
        },
        {
          repository: 'barRepository',
          snapshot: 'snapshot-2',
        },
      ],
    };

    it('should return successful ES responses', async () => {
      const mockEsResponse = { acknowledged: true };

      router.callAsCurrentUserResponses = [mockEsResponse, mockEsResponse];

      const expectedResponse = {
        itemsDeleted: [
          { snapshot: 'snapshot-1', repository: 'fooRepository' },
          { snapshot: 'snapshot-2', repository: 'barRepository' },
        ],
        errors: [],
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return error ES responses', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;

      router.callAsCurrentUserResponses = [
        jest.fn().mockRejectedValueOnce(mockEsError),
        jest.fn().mockRejectedValueOnce(mockEsError),
      ];

      const expectedResponse = {
        itemsDeleted: [],
        errors: [
          {
            id: { snapshot: 'snapshot-1', repository: 'fooRepository' },
            error: { cause: mockEsError.message, statusCode: 500 },
          },
          {
            id: { snapshot: 'snapshot-2', repository: 'barRepository' },
            error: { cause: mockEsError.message, statusCode: 500 },
          },
        ],
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return combination of ES successes and errors', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;
      const mockEsResponse = { acknowledged: true };

      router.callAsCurrentUserResponses = [
        jest.fn().mockRejectedValueOnce(mockEsError),
        mockEsResponse,
      ];

      const expectedResponse = {
        itemsDeleted: [{ snapshot: 'snapshot-2', repository: 'barRepository' }],
        errors: [
          {
            id: { snapshot: 'snapshot-1', repository: 'fooRepository' },
            error: { cause: mockEsError.message, statusCode: 500 },
          },
        ],
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });
  });
});
