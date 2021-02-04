/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSearchSettingsRoutes } from './search_settings';

describe('search settings routes', () => {
  const boosts = {
    types: [
      {
        type: 'value',
        factor: 6.2,
        value: ['1313'],
      },
    ],
    hp: [
      {
        function: 'exponential',
        type: 'functional',
        factor: 1,
        operation: 'add',
      },
    ],
  };
  const resultFields = {
    id: {
      raw: {},
    },
    hp: {
      raw: {},
    },
    name: {
      raw: {},
    },
  };
  const searchFields = {
    hp: {
      weight: 1,
    },
    name: {
      weight: 1,
    },
    id: {
      weight: 1,
    },
  };
  const searchSettings = {
    boosts,
    result_fields: resultFields,
    search_fields: searchFields,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/app_search/engines/{name}/search_settings/details', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/api/app_search/engines/{engineName}/search_settings/details',
    });

    beforeEach(() => {
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
        path: '/as/engines/:engineName/search_settings/details',
      });
    });
  });

  describe('PUT /api/app_search/engines/{name}/search_settings', () => {
    const mockRouter = new MockRouter({
      method: 'put',
      path: '/api/app_search/engines/{engineName}/search_settings',
      payload: 'body',
    });

    beforeEach(() => {
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
        path: '/as/engines/:engineName/search_settings',
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
    const mockRouter = new MockRouter({
      method: 'post',
      path: '/api/app_search/engines/{engineName}/search_settings/reset',
    });

    beforeEach(() => {
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
        path: '/as/engines/:engineName/search_settings/reset',
      });
    });
  });

  describe('POST /api/app_search/engines/{name}/search_settings_search', () => {
    const mockRouter = new MockRouter({
      method: 'post',
      path: '/api/app_search/engines/{engineName}/search_settings_search',
      payload: 'body',
    });

    beforeEach(() => {
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
        path: '/as/engines/:engineName/search_settings_search',
      });
    });

    describe('validates body', () => {
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
      const queryRouter = new MockRouter({
        method: 'post',
        path: '/api/app_search/engines/{engineName}/search_settings_search',
        payload: 'query',
      });

      it('correctly', () => {
        registerSearchSettingsRoutes({
          ...mockDependencies,
          router: queryRouter.router,
        });

        const request = {
          query: {
            query: 'foo',
          },
        };
        queryRouter.shouldValidate(request);
      });

      it('missing required fields', () => {
        const request = { query: {} };
        queryRouter.shouldThrow(request);
      });
    });
  });
});
