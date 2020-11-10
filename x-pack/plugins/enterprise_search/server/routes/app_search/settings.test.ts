/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSettingsRoutes } from './settings';

describe('log settings routes', () => {
  describe('GET /api/app_search/log_settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/log_settings',
      });

      registerSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/log_settings',
      });
    });
  });

  describe('PUT /api/app_search/log_settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/app_search/log_settings',
        payload: 'body',
      });

      registerSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({});
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/log_settings',
      });
    });

    describe('validates', () => {
      it('validates good data', () => {
        const request = {
          body: {
            analytics: { enabled: true },
            api: { enabled: true },
          },
        };
        mockRouter.shouldValidate(request);
      });

      it('rejects bad data', () => {
        const request = {
          body: {
            foo: 'bar',
          },
        };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
