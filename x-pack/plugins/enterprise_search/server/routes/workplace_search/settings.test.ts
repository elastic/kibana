/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import {
  registerOrgSettingsRoute,
  registerOrgSettingsCustomizeRoute,
  registerOrgSettingsOauthApplicationRoute,
} from './settings';

describe('settings routes', () => {
  describe('GET /api/workplace_search/org/settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/settings',
        payload: 'params',
      });

      registerOrgSettingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings',
      });
    });
  });

  describe('PUT /api/workplace_search/org/settings/customize', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/org/settings/customize',
        payload: 'body',
      });

      registerOrgSettingsCustomizeRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        body: {
          name: 'foo',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/customize',
        body: mockRequest.body,
      });
    });
  });

  describe('PUT /api/workplace_search/org/settings/oauth_application', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/org/settings/oauth_application',
        payload: 'body',
      });

      registerOrgSettingsOauthApplicationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        body: {
          oauth_application: {
            name: 'foo',
            confidential: true,
            redirect_uri: 'http://foo.bar',
          },
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/oauth_application',
        body: mockRequest.body,
      });
    });
  });
});
