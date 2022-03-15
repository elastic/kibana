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
  const getSnapshotFn = router.getMockApiFn('snapshot.get');
  const deleteSnapshotFn = router.getMockApiFn('snapshot.delete');
  const getRepoFn = router.getMockApiFn('snapshot.getRepository');

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
      query: {
        sortField: 'startTimeInMillis',
        sortDirection: 'desc',
      },
    };

    const mockSnapshotGetManagedRepositoryEsResponse = {
      defaults: {
        'cluster.metadata.managed_repository': 'myManagedRepository',
      },
    };

    test('combines snapshots and their repositories returned from ES', async () => {
      const mockGetPolicyEsResponse = {
        fooPolicy: {},
      };

      const mockGetSnapshotsResponse = {
        snapshots: [
          { snapshot: 'snapshot1', repository: 'fooRepository' },
          { snapshot: 'snapshot2', repository: 'barRepository' },
        ],
      };

      const mockGetRepositoryEsResponse = {
        fooRepository: {},
        barRepository: {},
        // Test that there may be a repository that does not yet have any snapshots associated to it
        bazRepository: {},
      };

      getClusterSettingsFn.mockResolvedValue(mockSnapshotGetManagedRepositoryEsResponse);
      getLifecycleFn.mockResolvedValue(mockGetPolicyEsResponse);
      getRepoFn.mockResolvedValue(mockGetRepositoryEsResponse);
      getSnapshotFn.mockResolvedValue(mockGetSnapshotsResponse);

      const expectedResponse = {
        repositories: ['fooRepository', 'barRepository', 'bazRepository'],
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

    test('returns an error object if ES request contains repository failures', async () => {
      const mockGetPolicyEsResponse = {
        fooPolicy: {},
      };

      const mockGetSnapshotsResponse = {
        snapshots: [{ snapshot: 'snapshot1', repository: 'fooRepository' }],
        failures: {
          bar: {
            type: 'repository_exception',
            reason:
              "[barRepository] Could not read repository data because the contents of the repository do not match its expected state. This is likely the result of either concurrently modifying the contents of the repository by a process other than this cluster or an issue with the repository's underlying storage. The repository has been disabled to prevent corrupting its contents. To re-enable it and continue using it please remove the repository from the cluster and add it again to make the cluster recover the known state of the repository from its physical contents.",
          },
        },
      };

      const mockGetRepositoryEsResponse = {
        fooRepository: {},
      };

      getClusterSettingsFn.mockResolvedValue(mockSnapshotGetManagedRepositoryEsResponse);
      getLifecycleFn.mockResolvedValue(mockGetPolicyEsResponse);
      getRepoFn.mockResolvedValue(mockGetRepositoryEsResponse);
      getSnapshotFn.mockResolvedValue(mockGetSnapshotsResponse);

      const expectedResponse = {
        repositories: ['fooRepository'],
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
        ],
        errors: {
          bar: {
            type: 'repository_exception',
            reason:
              "[barRepository] Could not read repository data because the contents of the repository do not match its expected state. This is likely the result of either concurrently modifying the contents of the repository by a process other than this cluster or an issue with the repository's underlying storage. The repository has been disabled to prevent corrupting its contents. To re-enable it and continue using it please remove the repository from the cluster and add it again to make the cluster recover the known state of the repository from its physical contents.",
          },
        },
      };

      const response = await router.runRequest(mockRequest);
      expect(response).toEqual({ body: expectedResponse });
    });

    test('returns empty arrays if no repositories returned from ES', async () => {
      getClusterSettingsFn.mockResolvedValue(mockSnapshotGetManagedRepositoryEsResponse);
      getLifecycleFn.mockResolvedValue({});
      getRepoFn.mockResolvedValue({});

      const expectedResponse = {
        snapshots: [],
        repositories: [],
        policies: [],
      };

      const response = await router.runRequest(mockRequest);
      expect(response).toEqual({ body: expectedResponse });
    });

    test('returns an empty snapshot array if no snapshots returned from ES', async () => {
      const mockGetRepositoryEsResponse = {
        fooRepository: {},
      };

      getClusterSettingsFn.mockResolvedValue({
        body: mockSnapshotGetManagedRepositoryEsResponse,
      });
      getLifecycleFn.mockResolvedValue({});
      getRepoFn.mockResolvedValue(mockGetRepositoryEsResponse);
      getSnapshotFn.mockResolvedValue({});

      const expectedResponse = {
        snapshots: [],
        repositories: ['fooRepository'],
        policies: [],
      };

      const response = await router.runRequest(mockRequest);
      expect(response).toEqual({ body: expectedResponse });
    });

    test('throws if ES error', async () => {
      getClusterSettingsFn.mockRejectedValue(new Error());
      getLifecycleFn.mockRejectedValue(new Error());
      getRepoFn.mockRejectedValue(new Error());
      getSnapshotFn.mockRejectedValue(new Error());

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
      const mockGetSnapshotEsResponse = {
        snapshots: [{ snapshot, repository }],
      };

      getClusterSettingsFn.mockResolvedValue(mockSnapshotGetManagedRepositoryEsResponse);
      getSnapshotFn.mockResolvedValue(mockGetSnapshotEsResponse);

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

      getClusterSettingsFn.mockResolvedValue(mockSnapshotGetManagedRepositoryEsResponse);
      getSnapshotFn.mockResolvedValue(mockSnapshotGetEsResponse);

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

      deleteSnapshotFn.mockResolvedValueOnce(mockEsResponse);
      deleteSnapshotFn.mockResolvedValueOnce(mockEsResponse);

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
      deleteSnapshotFn.mockResolvedValueOnce(mockEsResponse);

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
