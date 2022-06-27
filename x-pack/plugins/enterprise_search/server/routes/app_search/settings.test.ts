/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSettingsRoutes } from './settings';

describe('log settings routes', () => {
  describe('GET /internal/app_search/log_settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/app_search/log_settings',
      });

      registerSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/log_settings',
      });
    });
  });

  describe('PUT /internal/app_search/log_settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/app_search/log_settings',
      });

      registerSettingsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/log_settings',
      });
    });

    describe('validates', () => {
      it('validates good data', () => {
        mockRouter.shouldValidate({
          body: {
            analytics: { enabled: true },
          },
        });
        mockRouter.shouldValidate({
          body: {
            api: { enabled: true },
          },
        });
        mockRouter.shouldValidate({
          body: {
            crawler: { enabled: true },
          },
        });
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
