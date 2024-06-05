/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerOnboardingRoutes } from './onboarding';

describe('engine routes', () => {
  describe('POST /internal/app_search/onboarding_complete', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/app_search/onboarding_complete',
      });

      registerOnboardingRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', async () => {
      await mockRouter.callRoute({ body: {} });
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/onboarding/complete',
        hasJsonResponse: false,
      });
    });

    it('validates seed_sample_engine ', () => {
      const request = { body: { seed_sample_engine: true } };
      mockRouter.shouldValidate(request);
    });
  });
});
