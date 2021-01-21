/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSearchSettingsRoutes } from './search_settings';

describe('search settings routes', () => {
  const boosts = { foo: [{}] };
  const resultFields = { foo: {} };
  const searchFields = { foo: {} };
  const searchSettings = {
    boosts,
    result_fields: resultFields,
    search_fields: searchFields,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/app_search/engines/{name}/search_settings/details', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/engines/{engineName}/search_settings/details',
      });

      registerSearchSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/search_settings/details',
      });
    });
  });

  describe('PUT /api/app_search/engines/{name}/search_settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/app_search/engines/{engineName}/search_settings',
        payload: 'body',
      });

      registerSearchSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
        body: searchSettings,
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/search_settings',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: searchSettings };
        mockRouter.shouldValidate(request);
      });

      it('missing required fields', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });

  describe('POST /api/app_search/engines/{name}/search_settings/reset', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/app_search/engines/{engineName}/search_settings/reset',
      });

      registerSearchSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/search_settings/reset',
      });
    });
  });

  describe('POST /api/app_search/engines/{name}/search_settings_search', () => {
    let mockRouter: MockRouter;

    it('creates a request to enterprise search', () => {
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/app_search/engines/{engineName}/search_settings_search',
        payload: 'body',
      });

      registerSearchSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });

      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
        body: searchSettings,
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/search_settings_search',
      });
    });

    describe('validates body', () => {
      beforeEach(() => {
        mockRouter = new MockRouter({
          method: 'post',
          path: '/api/app_search/engines/{engineName}/search_settings_search',
          payload: 'body',
        });

        registerSearchSettingsRoutes({
          ...mockDependencies,
          router: mockRouter.router,
        });
      });

      it('correctly', () => {
        const request = {
          body: {
            boosts,
            search_fields: searchFields,
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('missing required fields', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });

    describe('validates query', () => {
      it('correctly', () => {
        mockRouter = new MockRouter({
          method: 'post',
          path: '/api/app_search/engines/{engineName}/search_settings_search',
          payload: 'query',
        });

        registerSearchSettingsRoutes({
          ...mockDependencies,
          router: mockRouter.router,
        });

        const request = {
          query: {
            query: 'foo',
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('missing required fields', () => {
        const request = { query: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
