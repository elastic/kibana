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
    precision: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /internal/app_search/engines/{name}/search_settings/details', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/app_search/engines/{engineName}/search_settings/details',
    });

    beforeEach(() => {
      registerSearchSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', async () => {
      await mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/search_settings/details',
      });
    });
  });

  describe('PUT /internal/app_search/engines/{name}/search_settings', () => {
    const mockRouter = new MockRouter({
      method: 'put',
      path: '/internal/app_search/engines/{engineName}/search_settings',
    });

    beforeEach(() => {
      registerSearchSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', async () => {
      await mockRouter.callRoute({
        params: { engineName: 'some-engine' },
        body: searchSettings,
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/search_settings',
      });
    });
  });

  describe('POST /internal/app_search/engines/{name}/search_settings/reset', () => {
    const mockRouter = new MockRouter({
      method: 'post',
      path: '/internal/app_search/engines/{engineName}/search_settings/reset',
    });

    beforeEach(() => {
      registerSearchSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', async () => {
      await mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/search_settings/reset',
      });
    });
  });
});
