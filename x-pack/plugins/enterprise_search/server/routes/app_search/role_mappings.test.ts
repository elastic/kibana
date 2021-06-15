/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerRoleMappingsRoute, registerRoleMappingRoute } from './role_mappings';

const roleMappingBaseSchema = {
  rules: { username: 'user' },
  roleType: 'owner',
  engines: ['e1', 'e2'],
  accessAllEngines: false,
  authProvider: ['*'],
};

describe('role mappings routes', () => {
  describe('GET /api/app_search/role_mappings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/role_mappings',
      });

      registerRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/role_mappings',
      });
    });
  });

  describe('POST /api/app_search/role_mappings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/app_search/role_mappings',
      });

      registerRoleMappingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/role_mappings',
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

  describe('PUT /api/app_search/role_mappings/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/app_search/role_mappings/{id}',
      });

      registerRoleMappingRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/role_mappings/:id',
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

  describe('DELETE /api/app_search/role_mappings/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/app_search/role_mappings/{id}',
      });

      registerRoleMappingRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/role_mappings/:id',
      });
    });
  });
});
