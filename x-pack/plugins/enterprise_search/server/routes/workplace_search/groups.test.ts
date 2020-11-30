/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import {
  registerGroupsRoute,
  registerSearchGroupsRoute,
  registerGroupRoute,
  registerGroupUsersRoute,
  registerShareGroupRoute,
  registerAssignGroupRoute,
  registerBoostsGroupRoute,
} from './groups';

describe('groups routes', () => {
  describe('GET /api/workplace_search/groups', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/groups',
        payload: 'query',
      });

      registerGroupsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups',
      });
    });
  });

  describe('POST /api/workplace_search/groups', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/groups',
        payload: 'body',
      });

      registerGroupsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        body: {
          group_name: 'group',
        },
      };
      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups',
        ...mockRequest,
      });
    });
  });

  describe('POST /api/workplace_search/groups/search', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/groups/search',
        payload: 'body',
      });

      registerSearchGroupsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        body: {
          page: {
            current: 1,
            size: 1,
          },
          search: {
            query: 'foo',
            content_source_ids: ['123', '234'],
            user_ids: ['345', '456'],
          },
        },
      };
      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/search',
        ...mockRequest,
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            page: {
              current: 1,
              size: 1,
            },
            search: {
              query: 'foo',
              content_source_ids: ['123', '234'],
              user_ids: ['345', '456'],
            },
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('throws on unnecessary properties', () => {
        const request = {
          body: {
            page: null,
            search: {
              kites: 'bar',
            },
          },
        };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('GET /api/workplace_search/groups/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/groups/{id}',
        payload: 'params',
      });

      registerGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/123',
      });
    });
  });

  describe('PUT /api/workplace_search/groups/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const mockPayload = {
      group: {
        name: 'group',
      },
    };

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/groups/{id}',
        payload: 'body',
      });

      registerGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
        body: mockPayload,
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/123',
        body: mockPayload,
      });
    });
  });

  describe('DELETE /api/workplace_search/groups/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/workplace_search/groups/{id}',
        payload: 'params',
      });

      registerGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/123',
      });
    });
  });

  describe('GET /api/workplace_search/groups/{id}/group_users', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/groups/{id}/group_users',
        payload: 'params',
      });

      registerGroupUsersRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/123/group_users',
      });
    });
  });

  describe('POST /api/workplace_search/groups/{id}/share', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/groups/{id}/share',
        payload: 'body',
      });

      registerShareGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        params: { id: '123' },
        body: {
          content_source_ids: ['123', '234'],
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/123/share',
        body: mockRequest.body,
      });
    });
  });

  describe('POST /api/workplace_search/groups/{id}/assign', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/groups/{id}/assign',
        payload: 'body',
      });

      registerAssignGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        params: { id: '123' },
        body: {
          user_ids: ['123', '234'],
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/123/assign',
        body: mockRequest.body,
      });
    });
  });

  describe('PUT /api/workplace_search/groups/{id}/boosts', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const mockPayload = {
      group: {
        content_source_boosts: [['boost'], ['boost2', 'boost3']],
      },
    };

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/groups/{id}/boosts',
        payload: 'body',
      });

      registerBoostsGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
        body: mockPayload,
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/123/update_source_boosts',
        body: mockPayload,
      });
    });
  });
});
