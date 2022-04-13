/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerSearchUIRoutes } from './search_ui';

describe('reference application routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /internal/app_search/engines/{engineName}/search_settings/details', () => {
    const mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/app_search/engines/{engineName}/search_ui/field_config',
    });

    beforeEach(() => {
      registerSearchUIRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/search_experience/field_config',
      });
    });
  });
});
