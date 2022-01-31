/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common';
import { addBasePath } from '../helpers';
import { registerRepositoriesRoutes } from './repositories';
import { RouterMock, routeDependencies, RequestMock } from '../../test/helpers';

describe('[Snapshot and Restore API Routes] Repositories', () => {
  const managedRepositoryName = 'myManagedRepository';

  const mockSnapshotGetManagedRepositoryEsResponse = {
    defaults: {
      'cluster.metadata.managed_repository': managedRepositoryName,
    },
  };

  const router = new RouterMock();

  /**
   * ES APIs used by these endpoints
   */
  const clusterSettingsFn = router.getMockApiFn('cluster.getSettings');
  const createRepoFn = router.getMockApiFn('snapshot.createRepository');
  const getRepoFn = router.getMockApiFn('snapshot.getRepository');
  const deleteRepoFn = router.getMockApiFn('snapshot.deleteRepository');
  const getLifecycleFn = router.getMockApiFn('slm.getLifecycle');
  const getClusterSettingsFn = router.getMockApiFn('cluster.getSettings');
  const getSnapshotFn = router.getMockApiFn('snapshot.get');
  const verifyRepoFn = router.getMockApiFn('snapshot.verifyRepository');
  const nodesInfoFn = router.getMockApiFn('nodes.info');

  beforeAll(() => {
    registerRepositoriesRoutes({
      ...routeDependencies,
      router,
    });
  });

  describe('getAllHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('repositories'),
    };

    it('should arrify repositories returned from ES', async () => {
      const mockRepositoryEsResponse = {
        fooRepository: {},
        barRepository: {},
      };

      const mockPolicyEsResponse = {
        my_policy: {
          policy: {
            repository: managedRepositoryName,
          },
        },
      };

      clusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getRepoFn.mockResolvedValue({ body: mockRepositoryEsResponse });
      getLifecycleFn.mockResolvedValue({ body: mockPolicyEsResponse });

      const expectedResponse = {
        repositories: [
          {
            name: 'fooRepository',
            type: '',
            settings: {},
          },
          {
            name: 'barRepository',
            type: '',
            settings: {},
          },
        ],
        managedRepository: {
          name: managedRepositoryName,
          policy: 'my_policy',
        },
      };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockRepositoryEsResponse = {};
      const mockPolicyEsResponse = {
        my_policy: {
          policy: {
            repository: managedRepositoryName,
          },
        },
      };

      clusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getRepoFn.mockResolvedValue({ body: mockRepositoryEsResponse });
      getLifecycleFn.mockResolvedValue({ body: mockPolicyEsResponse });

      const expectedResponse = {
        repositories: [],
        managedRepository: {
          name: managedRepositoryName,
          policy: 'my_policy',
        },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      clusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getRepoFn.mockRejectedValue(new Error());

      await expect(router.runRequest(mockRequest)).rejects.toThrowError();
    });
  });

  describe('getOneHandler()', () => {
    const name = 'fooRepository';

    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('repositories/{name}'),
      params: {
        name,
      },
    };

    it('should return repository object if returned from ES', async () => {
      const mockEsResponse = {
        [name]: { type: '', settings: {} },
      };

      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getRepoFn.mockResolvedValue({ body: mockEsResponse });
      getSnapshotFn.mockResolvedValue({ body: {} });

      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        isManagedRepository: false,
        snapshots: { count: null },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return empty repository object if not returned from ES', async () => {
      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getRepoFn.mockResolvedValue({ body: {} });
      getSnapshotFn.mockResolvedValue({ body: {} });

      const expectedResponse = {
        repository: {},
        snapshots: {},
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return snapshot count from ES', async () => {
      const mockEsResponse = {
        [name]: { type: '', settings: {} },
      };
      const mockEsSnapshotResponse = {
        snapshots: [{ repository: name }, { repository: name }],
      };

      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getRepoFn.mockResolvedValue({ body: mockEsResponse });
      getSnapshotFn.mockResolvedValue({ body: mockEsSnapshotResponse });

      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        isManagedRepository: false,
        snapshots: {
          count: 2,
        },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return null snapshot count if ES error', async () => {
      const mockEsResponse = {
        [name]: { type: '', settings: {} },
      };

      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });
      getRepoFn.mockResolvedValue({ body: mockEsResponse });
      getSnapshotFn.mockRejectedValueOnce(new Error('snapshot error'));

      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        isManagedRepository: false,
        snapshots: {
          count: null,
        },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      getClusterSettingsFn.mockResolvedValue({ body: mockSnapshotGetManagedRepositoryEsResponse });

      getRepoFn.mockRejectedValue(new Error());

      await expect(router.runRequest(mockRequest)).rejects.toThrowError();
    });
  });

  describe('getVerificationHandler', () => {
    const name = 'fooRepository';

    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('repositories/{name}/verify'),
      params: {
        name,
      },
    };

    it('should return repository verification response if returned from ES', async () => {
      const mockEsResponse = { nodes: {} };
      verifyRepoFn.mockResolvedValue({ body: mockEsResponse });

      const expectedResponse = {
        verification: { valid: true, response: mockEsResponse },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return repository verification error if returned from ES', async () => {
      const mockEsResponse = { error: {}, status: 500 };
      verifyRepoFn.mockRejectedValueOnce(mockEsResponse);

      const expectedResponse = {
        verification: { valid: false, error: mockEsResponse },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });
  });

  describe('getTypesHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('repository_types'),
    };

    it('returns default types if no repository plugins returned from ES', async () => {
      nodesInfoFn.mockResolvedValue({ body: { nodes: { testNodeId: { plugins: [] } } } });

      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('returns default types with any repository plugins returned from ES', async () => {
      const pluginNames = Object.keys(REPOSITORY_PLUGINS_MAP);
      const pluginTypes = Object.entries(REPOSITORY_PLUGINS_MAP).map(([key, value]) => value);

      const mockEsResponse = {
        nodes: { testNodeId: { plugins: [...pluginNames.map((key) => ({ name: key }))] } },
      };
      nodesInfoFn.mockResolvedValue({ body: mockEsResponse });

      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES, ...pluginTypes];
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it(`doesn't return non-repository plugins returned from ES`, async () => {
      const pluginNames = ['foo-plugin', 'bar-plugin'];
      const mockEsResponse = {
        nodes: { testNodeId: { plugins: [...pluginNames.map((key) => ({ name: key }))] } },
      };
      nodesInfoFn.mockResolvedValue({ body: mockEsResponse });

      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it(`doesn't return repository plugins that are not installed on all nodes`, async () => {
      const dataNodePlugins = ['repository-hdfs'];
      const masterNodePlugins: string[] = [];
      const mockEsResponse = {
        nodes: {
          dataNode: { plugins: [...dataNodePlugins.map((key) => ({ name: key }))] },
          masterNode: { plugins: [...masterNodePlugins.map((key) => ({ name: key }))] },
        },
      };
      nodesInfoFn.mockResolvedValue({ body: mockEsResponse });

      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      nodesInfoFn.mockRejectedValueOnce(new Error('Error getting cluster stats'));

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(
        'Error getting cluster stats'
      );
    });
  });

  describe('createHandler()', () => {
    const name = 'fooRepository';

    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('repositories'),
      body: {
        name,
      },
    };

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      getRepoFn.mockResolvedValue({ body: {} });
      createRepoFn.mockResolvedValue({ body: mockEsResponse });

      const expectedResponse = { ...mockEsResponse };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return error if repository with the same name already exists', async () => {
      getRepoFn.mockResolvedValue({ body: { [name]: {} } });
      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(409);
    });

    it('should throw if ES error', async () => {
      const error = new Error('Oh no!');
      getRepoFn.mockResolvedValue({ body: {} });
      createRepoFn.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });

  describe('updateHandler()', () => {
    const name = 'fooRepository';
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('repositories/{name}'),
      params: {
        name,
      },
      body: {
        name,
      },
    };

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      getRepoFn.mockResolvedValue({ body: { [name]: {} } });
      createRepoFn.mockResolvedValue({ body: mockEsResponse });

      const expectedResponse = mockEsResponse;

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      getRepoFn.mockRejectedValue(new Error());
      await expect(router.runRequest(mockRequest)).rejects.toThrowError();
    });
  });

  describe('deleteHandler()', () => {
    const names = ['fooRepository', 'barRepository'];
    const mockRequest: RequestMock = {
      method: 'delete',
      path: addBasePath('repositories/{name}'),
      params: {
        name: names.join(','),
      },
    };

    it('should return successful ES responses', async () => {
      const mockEsResponse = { acknowledged: true };
      deleteRepoFn.mockResolvedValueOnce({ body: mockEsResponse });
      deleteRepoFn.mockResolvedValueOnce({ body: mockEsResponse });

      const expectedResponse = { itemsDeleted: names, errors: [] };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return error ES responses', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;

      deleteRepoFn.mockRejectedValueOnce(mockEsError);
      deleteRepoFn.mockRejectedValueOnce(mockEsError);

      const expectedResponse = {
        itemsDeleted: [],
        errors: names.map((name) => ({
          name,
          error: { cause: mockEsError.message, statusCode: 500 },
        })),
      };

      const response = await router.runRequest(mockRequest);
      expect(response).toEqual({ body: expectedResponse });
    });

    it('should return combination of ES successes and errors', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;
      const mockEsResponse = { acknowledged: true };
      const responses = [Promise.reject(mockEsError), Promise.resolve({ body: mockEsResponse })];

      deleteRepoFn.mockImplementation(() => responses.shift());

      const expectedResponse = {
        itemsDeleted: [names[1]],
        errors: [
          {
            name: names[0],
            error: { cause: mockEsError.message, statusCode: 500 },
          },
        ],
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });
  });
});
