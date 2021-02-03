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
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/groups',
        payload: 'query',
      });

      registerGroupsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
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
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            group_name: 'group',
          },
        };
        mockRouter.shouldValidate(request);
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
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/search',
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
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/groups/{id}',
      });

      registerGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/:id',
      });
    });
  });

  describe('PUT /api/workplace_search/groups/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/groups/{id}',
        payload: 'body',
      });

      registerGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/:id',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            group: {
              name: 'group',
            },
          },
        };
        mockRouter.shouldValidate(request);
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
      });

      registerGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/:id',
      });
    });
  });

  describe('GET /api/workplace_search/groups/{id}/group_users', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/groups/{id}/group_users',
      });

      registerGroupUsersRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/:id/group_users',
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
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/:id/share',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          params: { id: '123' },
          body: {
            content_source_ids: ['123', '234'],
          },
        };
        mockRouter.shouldValidate(request);
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
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/:id/assign',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          params: { id: '123' },
          body: {
            user_ids: ['123', '234'],
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('PUT /api/workplace_search/groups/{id}/boosts', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/groups/{id}/boosts',
        payload: 'body',
      });

      registerBoostsGroupRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/groups/:id/update_source_boosts',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            content_source_boosts: [['boost'], ['boost2', 'boost3']],
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });
});
