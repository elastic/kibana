/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerResultSettingsRoutes } from './result_settings';

describe('result settings routes', () => {
  describe('GET /api/app_search/engines/{name}/result_settings/details', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/api/app_search/engines/{engineName}/result_settings/details',
    });

    beforeEach(() => {
      registerResultSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/result_settings/details',
      });
    });
  });
});
