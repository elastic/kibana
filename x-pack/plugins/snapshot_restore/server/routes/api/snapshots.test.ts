/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  const router = new RouterMock();

  /**
   * ES APIs used by these endpoints
   */
  const getClusterSettingsFn = router.getMockApiFn('cluster.getSettings');
  const getLifecycleFn = router.getMockApiFn('slm.getLifecycle');
  const getRepoFn = router.getMockApiFn('snapshot.getRepository');
  const getSnapshotFn = router.getMockApiFn('snapshot.get');
  const deleteSnapshotFn = router.getMockApiFn('snapshot.delete');

  beforeAll(() => {
    registerSnapshotsRoutes({
      ...routeDependencies,
      router,
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

      const mockGetSnapshotsFooResponse = {
        responses: [
          {
            repository: 'fooRepository',
            snapshots: [{ snapshot: 'snapshot1' }],
          },
        ],
      };

      const mockGetSnapshotsBarResponse = {
        responses: [
          {
            repository: 'barRepository',
            snapshots: [{ snapshot: 'snapshot2' }],
          },
        ],
      };

      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getLifecycleFn.mockResolvedValue({ body: mockSnapshotGetPolicyEsResponse });
      getRepoFn.mockResolvedValue({ body: mockSnapshotGetRepositoryEsResponse });
      getSnapshotFn.mockResolvedValueOnce({ body: mockGetSnapshotsFooResponse });
      getSnapshotFn.mockResolvedValueOnce({ body: mockGetSnapshotsBarResponse });

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

      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getLifecycleFn.mockResolvedValue({ body: mockSnapshotGetPolicyEsResponse });
      getRepoFn.mockResolvedValue({ body: mockSnapshotGetRepositoryEsResponse });

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
      getClusterSettingsFn.mockRejectedValueOnce(new Error());
      getLifecycleFn.mockRejectedValueOnce(new Error());
      getRepoFn.mockRejectedValueOnce(new Error());

      await expect(router.runRequest(mockRequest)).rejects.toThrowError();
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

      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getSnapshotFn.mockResolvedValueOnce({ body: mockSnapshotGetEsResponse });

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

      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getSnapshotFn.mockResolvedValueOnce({ body: mockSnapshotGetEsResponse });

      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: 'Snapshot not found',
        status: 404,
      });
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

      deleteSnapshotFn.mockResolvedValueOnce({ body: mockEsResponse });
      deleteSnapshotFn.mockResolvedValueOnce({ body: mockEsResponse });

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

      deleteSnapshotFn.mockRejectedValueOnce(mockEsError);
      deleteSnapshotFn.mockRejectedValueOnce(mockEsError);

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

      deleteSnapshotFn.mockRejectedValueOnce(mockEsError);
      deleteSnapshotFn.mockResolvedValueOnce({ body: mockEsResponse });

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
