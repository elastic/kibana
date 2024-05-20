/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import {
  registerEnableRoleMappingsRoute,
  registerRoleMappingsRoute,
  registerRoleMappingRoute,
  registerUserRoute,
} from './role_mappings';

const roleMappingBaseSchema = {
  rules: { username: 'user' },
  roleType: 'owner',
  engines: ['e1', 'e2'],
  accessAllEngines: false,
};

describe('role mappings routes', () => {
  describe('POST /internal/app_search/role_mappings/enable_role_based_access', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/role_mappings/enable_role_based_access',
      });

      registerEnableRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/role_mappings/enable_role_based_access',
      });
    });
  });

  describe('GET /internal/app_search/role_mappings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/role_mappings',
      });

      registerRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/role_mappings',
      });
    });
  });

  describe('POST /internal/app_search/role_mappings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/role_mappings',
      });

      registerRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/role_mappings',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: roleMappingBaseSchema };
        mockRouter.shouldValidate(request);
      });

      it('missing required fields', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('PUT /internal/app_search/role_mappings/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/app_search/role_mappings/{id}',
      });

      registerRoleMappingRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/role_mappings/:id',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: roleMappingBaseSchema };
        mockRouter.shouldValidate(request);
      });

      it('missing required fields', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('DELETE /internal/app_search/role_mappings/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/app_search/role_mappings/{id}',
      });

      registerRoleMappingRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/role_mappings/:id',
      });
    });
  });

  describe('POST /internal/app_search/single_user_role_mapping', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/single_user_role_mapping',
      });

      registerUserRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            roleMapping: {
              engines: ['foo', 'bar'],
              roleType: 'admin',
              accessAllEngines: true,
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
        path: '/as/role_mappings/upsert_single_user_role_mapping',
      });
    });
  });
});
