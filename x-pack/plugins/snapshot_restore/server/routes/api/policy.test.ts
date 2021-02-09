/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../helpers';
import { registerPolicyRoutes } from './policy';
import { RouterMock, routeDependencies, RequestMock } from '../../test/helpers';
import { ResolveIndexResponseFromES } from '../../types';

describe('[Snapshot and Restore API Routes] Policy', () => {
  const mockEsPolicy = {
    version: 1,
    modified_date_millis: 1562710315761,
    policy: {
      name: '<daily-snap-{now/d}>',
      schedule: '0 30 1 * * ?',
      repository: 'my-backups',
      config: {},
      retention: {
        expire_after: '15d',
        min_count: 5,
        max_count: 10,
      },
    },
    next_execution_millis: 1562722200000,
  };
  const mockPolicy = {
    version: 1,
    modifiedDateMillis: 1562710315761,
    snapshotName: '<daily-snap-{now/d}>',
    schedule: '0 30 1 * * ?',
    repository: 'my-backups',
    config: {},
    retention: {
      expireAfterValue: 15,
      expireAfterUnit: 'd',
      minCount: 5,
      maxCount: 10,
    },
    nextExecutionMillis: 1562722200000,
    isManagedPolicy: false,
  };

  const router = new RouterMock('snapshotRestore.client');

  beforeAll(() => {
    registerPolicyRoutes({
      router: router as any,
      ...routeDependencies,
    });
  });

  describe('getAllHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('policies'),
    };

    it('should arrify policies returned from ES', async () => {
      const mockEsResponse = {
        fooPolicy: mockEsPolicy,
        barPolicy: mockEsPolicy,
      };
      router.callAsCurrentUserResponses = [[], mockEsResponse];
      const expectedResponse = {
        policies: [
          {
            name: 'fooPolicy',
            ...mockPolicy,
          },
          {
            name: 'barPolicy',
            ...mockPolicy,
          },
        ],
      };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockEsResponse = {};
      router.callAsCurrentUserResponses = [[], mockEsResponse];
      const expectedResponse = { policies: [] };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [
        jest.fn().mockRejectedValueOnce(new Error()), // Get managed policyNames will silently fail
        jest.fn().mockRejectedValueOnce(new Error()), // Call to 'sr.policies'
      ];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('getOneHandler()', () => {
    const name = 'fooPolicy';
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('policy/{name}'),
      params: {
        name,
      },
    };

    it('should return policy if returned from ES', async () => {
      const mockEsResponse = {
        [name]: mockEsPolicy,
      };

      router.callAsCurrentUserResponses = [mockEsResponse, {}];

      const expectedResponse = {
        policy: {
          name,
          ...mockPolicy,
        },
      };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });

    it('should return 404 error if not returned from ES', async () => {
      router.callAsCurrentUserResponses = [{}, {}];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(404);
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(new Error())];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('executeHandler()', () => {
    const name = 'fooPolicy';

    const mockRequest: RequestMock = {
      method: 'post',
      path: addBasePath('policy/{name}/run'),
      params: {
        name,
      },
    };

    it('should return snapshot name from ES', async () => {
      const mockEsResponse = {
        snapshot_name: 'foo-policy-snapshot',
      };
      router.callAsCurrentUserResponses = [mockEsResponse];

      const expectedResponse = {
        snapshotName: 'foo-policy-snapshot',
      };

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

  describe('deleteHandler()', () => {
    const names = ['fooPolicy', 'barPolicy'];

    const mockRequest: RequestMock = {
      method: 'delete',
      path: addBasePath('policies/{name}'),
      params: {
        name: names.join(','),
      },
    };

    it('should return successful ES responses', async () => {
      const mockEsResponse = { acknowledged: true };
      router.callAsCurrentUserResponses = [mockEsResponse, mockEsResponse];

      const expectedResponse = { itemsDeleted: names, errors: [] };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
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
          error: {
            cause: mockEsError.message,
            statusCode: mockEsError.statusCode,
          },
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
            error: {
              cause: mockEsError.message,
              statusCode: mockEsError.statusCode,
            },
          },
        ],
      };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });
  });

  describe('createHandler()', () => {
    const name = 'fooPolicy';

    const mockRequest: RequestMock = {
      method: 'post',
      path: addBasePath('policies'),
      body: {
        name,
      },
    };

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      router.callAsCurrentUserResponses = [{}, mockEsResponse];

      const expectedResponse = { ...mockEsResponse };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({
        body: expectedResponse,
      });
    });

    it('should return error if policy with the same name already exists', async () => {
      const mockEsResponse = { [name]: {} };
      router.callAsCurrentUserResponses = [mockEsResponse];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(409);
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [{}, jest.fn().mockRejectedValueOnce(new Error())];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('updateHandler()', () => {
    const name = 'fooPolicy';
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('policies/{name}'),
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

      const expectedResponse = { ...mockEsResponse };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(new Error())];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('getIndicesHandler()', () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('policies/indices'),
    };

    it('should arrify and sort index names returned from ES', async () => {
      const mockEsResponse: ResolveIndexResponseFromES = {
        indices: [
          {
            name: 'fooIndex',
            attributes: ['open'],
          },
          {
            name: 'barIndex',
            attributes: ['open'],
            data_stream: 'testDataStream',
          },
        ],
        aliases: [],
        data_streams: [
          {
            name: 'testDataStream',
            backing_indices: ['barIndex'],
            timestamp_field: '@timestamp',
          },
        ],
      };
      router.callAsCurrentUserResponses = [mockEsResponse];

      const expectedResponse = {
        indices: ['fooIndex'],
        dataStreams: ['testDataStream'],
      };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should return empty array if no indices returned from ES', async () => {
      const mockEsResponse: ResolveIndexResponseFromES = {
        indices: [],
        aliases: [],
        data_streams: [],
      };
      router.callAsCurrentUserResponses = [mockEsResponse];

      const expectedResponse = { indices: [], dataStreams: [] };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(new Error())];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });

  describe('updateRetentionSettingsHandler()', () => {
    const retentionSettings = {
      retentionSchedule: '0 30 1 * * ?',
    };
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('policies/retention_settings'),
      body: retentionSettings,
    };

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      router.callAsCurrentUserResponses = [mockEsResponse];

      const expectedResponse = { ...mockEsResponse };
      await expect(router.runRequest(mockRequest)).resolves.toEqual({ body: expectedResponse });
    });

    it('should throw if ES error', async () => {
      router.callAsCurrentUserResponses = [jest.fn().mockRejectedValueOnce(new Error())];

      const response = await router.runRequest(mockRequest);
      expect(response.status).toBe(500);
    });
  });
});
