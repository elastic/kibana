/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import {
  registerOrgEnableRoleMappingsRoute,
  registerOrgRoleMappingsRoute,
  registerOrgRoleMappingRoute,
  registerOrgUserRoute,
} from './role_mappings';

describe('role mappings routes', () => {
  describe('POST /api/workplace_search/org/role_mappings/enable_role_based_access', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/role_mappings/enable_role_based_access',
      });

      registerOrgEnableRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/role_mappings/enable_role_based_access',
      });
    });
  });

  describe('GET /api/workplace_search/org/role_mappings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/role_mappings',
      });

      registerOrgRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/role_mappings/collection',
      });
    });
  });

  describe('POST /api/workplace_search/org/role_mappings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/role_mappings',
      });

      registerOrgRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/role_mappings/collection',
      });
    });
  });

  describe('PUT /api/workplace_search/org/role_mappings/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/org/role_mappings/{id}',
      });

      registerOrgRoleMappingRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/role_mappings/:id',
      });
    });
  });

  describe('DELETE /api/workplace_search/org/role_mappings/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/workplace_search/org/role_mappings/{id}',
      });

      registerOrgRoleMappingRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/role_mappings/:id',
      });
    });
  });

  describe('POST /api/workplace_search/org/single_user_role_mapping', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/single_user_role_mapping',
      });

      registerOrgUserRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            roleMapping: {
              groups: ['foo', 'bar'],
              roleType: 'admin',
              allGroups: true,
              id: '123asf',
            },
            elasticsearchUser: {
              username: 'user2@elastic.co',
              email: 'user2',
            },
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('missing required fields', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/role_mappings/upsert_single_user_role_mapping',
      });
    });
  });
});
