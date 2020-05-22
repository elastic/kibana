/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common/constants';
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

  const router = new RouterMock('snapshotRestore.client');

  beforeAll(() => {
    registerRepositoriesRoutes({
      router: router as any,
      ...routeDependencies,
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

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockRepositoryEsResponse,
        mockPolicyEsResponse,
      ];

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

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockRepositoryEsResponse,
        mockPolicyEsResponse,
      ];

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
      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        jest.fn().mockRejectedValueOnce(new Error()),
      ];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
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

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockEsResponse,
        {},
      ];

      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        isManagedRepository: false,
        snapshots: { count: null },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return empty repository object if not returned from ES', async () => {
      router.callAsCurrentUserResponses = [mockSnapshotGetManagedRepositoryEsResponse, {}, {}];

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
        responses: [
          {
            repository: name,
            snapshots: [{}, {}],
          },
        ],
      };

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockEsResponse,
        mockEsSnapshotResponse,
      ];

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
      const mockEsSnapshotError = jest.fn().mockRejectedValueOnce(new Error('snapshot error'));

      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        mockEsResponse,
        mockEsSnapshotError,
      ];

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
      router.callAsCurrentUserResponses = [
        mockSnapshotGetManagedRepositoryEsResponse,
        jest.fn().mockRejectedValueOnce(new Error()),
      ];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
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
      router.callAsCurrentUserResponses = [mockEsResponse];

      const expectedResponse = {
        verification: { valid: true, response: mockEsResponse },
      };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return repository verification error if returned from ES', async () => {
      const mockEsResponse = { error: {}, status: 500 };
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(mockEsResponse)];

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

    it('should return default types if no repository plugins returned from ES', async () => {
      router.callAsCurrentUserResponses = [{}];

      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return default types with any repository plugins returned from ES', async () => {
      const pluginNames = Object.keys(REPOSITORY_PLUGINS_MAP);
      const pluginTypes = Object.entries(REPOSITORY_PLUGINS_MAP).map(([key, value]) => value);

      const mockEsResponse = [...pluginNames.map((key) => ({ component: key }))];
      router.callAsCurrentUserResponses = [mockEsResponse];

      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES, ...pluginTypes];
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should not return non-repository plugins returned from ES', async () => {
      const pluginNames = ['foo-plugin', 'bar-plugin'];
      const mockEsResponse = [...pluginNames.map((key) => ({ component: key }))];
      router.callAsCurrentUserResponses = [mockEsResponse];

      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [
        jest.fn().mockRejectedValueOnce(new Error('Error getting pluggins')),
      ];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
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
      router.callAsCurrentUserResponses = [{}, mockEsResponse];

      const expectedResponse = { ...mockEsResponse };

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return error if repository with the same name already exists', async () => {
      router.callAsCurrentUserResponses = [{ [name]: {} }];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(409);
    });

    it('should throw if ES error', async () => {
      const error = new Error('Oh no!');
      router.callAsCurrentUserResponses = [{}, jest.fn().mockRejectedValueOnce(error)];

      const response = await router.runRequest(mockRequest);
      expect(response.body.message).toEqual(error.message);
      expect(response.status).toBe(500);
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
      router.callAsCurrentUserResponses = [{ [name]: {} }, mockEsResponse];

      const expectedResponse = mockEsResponse;

      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(new Error())];
      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
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
      router.callAsCurrentUserResponses = [mockEsResponse, mockEsResponse];

      const expectedResponse = { itemsDeleted: names, errors: [] };
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

      router.callAsCurrentUserResponses = [
        jest.fn().mockRejectedValueOnce(mockEsError),
        mockEsResponse,
      ];

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
