/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

jest.mock('../../utils/fetch_enterprise_search', () => ({
  ...jest.requireActual('../../utils/fetch_enterprise_search'),
  fetchEnterpriseSearch: jest.fn(),
}));
jest.mock('../../lib/engines/field_capabilities', () => ({
  fetchEngineFieldCapabilities: jest.fn(),
}));

import { RequestHandlerContext } from '@kbn/core/server';

import { fetchEngineFieldCapabilities } from '../../lib/engines/field_capabilities';
import { fetchEnterpriseSearch } from '../../utils/fetch_enterprise_search';

import { registerEnginesRoutes } from './engines';

describe('engines routes', () => {
  describe('GET /internal/enterprise_search/engines', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/engines',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines',
      });
    });

    it('validates query parameters', () => {
      const request = { query: { from: 20, size: 20 } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation with invalid from parameter', () => {
      const request = { query: { from: -10 } };

      mockRouter.shouldThrow(request);
    });

    it('fails validation with invalid size parameter', () => {
      const request = { query: { size: 0 } };

      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/engines', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/engines',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = {
        body: {
          indices: ['search-unit-test'],
          name: 'some-engine',
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without body', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });

    it('fails validation without name', () => {
      const request = {
        body: {
          indices: ['search-unit-test'],
        },
      };

      mockRouter.shouldThrow(request);
    });

    it('fails validation without indices', () => {
      const request = {
        body: {
          name: 'some-engine',
        },
      };

      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/engines/{engine_name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/engines/{engine_name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = { params: { engine_name: 'some-engine' } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });

  describe('PUT /internal/enterprise_search/engines/{engine_name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/enterprise_search/engines/{engine_name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = {
        params: { engine_name: 'some-engine' },
        body: {
          indices: ['search-unit-test'],
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });

    it('fails validation without indices', () => {
      const request = {
        params: { engine_name: 'some-engine' },
        body: {
          name: 'some-engine',
        },
      };

      mockRouter.shouldThrow(request);
    });
  });

  describe('DELETE /internal/enterprise_search/engines/{engine_name}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/enterprise_search/engines/{engine_name}',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name',
      });
    });

    it('validates correctly with engine_name', () => {
      const request = { params: { engine_name: 'some-engine' } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/engines/{engine_name}/search', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/enterprise_search/engines/{engine_name}/search',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });
    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name/_search',
      });
    });

    it('validates correctly with engine_name and pagination', () => {
      const request = {
        body: {
          query: 'test-query',
          fields: ['test-field-1', 'test-field-2'],
        },
        params: {
          engine_name: 'some-engine',
          from: 0,
          size: 10,
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('validates correctly with default pagination and no body', () => {
      const request = {
        params: {
          engine_name: 'my-test-engine',
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('validation with query and without fields', () => {
      const request = {
        params: {
          engine_name: 'my-test-engine',
        },
        body: {
          query: 'sample-query',
          fields: [],
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without engine name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/engines/{engine_name}/field_capabilities', () => {
    let mockRouter: MockRouter;
    const mockClient = {
      asCurrentUser: {},
    };
    const mockCore = {
      elasticsearch: { client: mockClient },
      savedObjects: { client: {} },
    };

    beforeEach(() => {
      jest.clearAllMocks();

      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/engines/{engine_name}/field_capabilities',
      });

      registerEnginesRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fetches engine fields', async () => {
      const engineResult = {
        created: '1999-12-31T23:59:59.999Z',
        indices: [],
        name: 'unit-test',
        updated: '1999-12-31T23:59:59.999Z',
      };
      const fieldCapabilitiesResult = {
        name: 'unit-test',
      };

      (fetchEnterpriseSearch as jest.Mock).mockResolvedValueOnce(engineResult);
      (fetchEngineFieldCapabilities as jest.Mock).mockResolvedValueOnce(fieldCapabilitiesResult);

      await mockRouter.callRoute({
        params: { engine_name: 'unit-test' },
      });

      expect(fetchEnterpriseSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        '/api/engines/unit-test'
      );
      expect(fetchEngineFieldCapabilities).toHaveBeenCalledWith(mockClient, engineResult);
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: fieldCapabilitiesResult,
        headers: { 'content-type': 'application/json' },
      });
    });
    it('returns 404 when fetch engine is undefined', async () => {
      (fetchEnterpriseSearch as jest.Mock).mockResolvedValueOnce(undefined);
      await mockRouter.callRoute({
        params: { engine_name: 'unit-test' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'engine_not_found',
          },
          message: 'Could not find engine',
        },
        statusCode: 404,
      });
    });
    it('returns 404 when fetch engine is returns 404', async () => {
      (fetchEnterpriseSearch as jest.Mock).mockResolvedValueOnce({
        responseStatus: 404,
        responseStatusText: 'NOT_FOUND',
      });
      await mockRouter.callRoute({
        params: { engine_name: 'unit-test' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'engine_not_found',
          },
          message: 'Could not find engine',
        },
        statusCode: 404,
      });
    });
    it('returns error when fetch engine returns an error', async () => {
      (fetchEnterpriseSearch as jest.Mock).mockResolvedValueOnce({
        responseStatus: 500,
        responseStatusText: 'INTERNAL_SERVER_ERROR',
      });
      await mockRouter.callRoute({
        params: { engine_name: 'unit-test' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'uncaught_exception',
          },
          message: 'Error fetching engine',
        },
        statusCode: 500,
      });
    });
  });
});
