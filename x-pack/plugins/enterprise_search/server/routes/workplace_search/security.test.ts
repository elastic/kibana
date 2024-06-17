/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSecurityRoute, registerSecuritySourceRestrictionsRoute } from './security';

describe('security routes', () => {
  describe('GET /internal/workplace_search/org/security', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/security',
      });

      registerSecurityRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', async () => {
      await mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/security',
      });
    });
  });

  describe('GET /internal/workplace_search/org/security/source_restrictions', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/security/source_restrictions',
      });

      registerSecuritySourceRestrictionsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', async () => {
      await mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/security/source_restrictions',
      });
    });
  });

  describe('PATCH /internal/workplace_search/org/security/source_restrictions', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRouter = new MockRouter({
        method: 'patch',
        path: '/internal/workplace_search/org/security/source_restrictions',
      });

      registerSecuritySourceRestrictionsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/security/source_restrictions',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            isEnabled: true,
            remote: {
              isEnabled: true,
              contentSources: [{ id: 'gmail', name: 'Gmail', isEnabled: true }],
            },
            standard: {
              isEnabled: false,
              contentSources: [{ id: 'dropbox', name: 'Dropbox', isEnabled: false }],
            },
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });
});
