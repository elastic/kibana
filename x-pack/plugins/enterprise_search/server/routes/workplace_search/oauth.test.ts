/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import {
  registerOAuthAuthorizeRoute,
  registerOAuthAuthorizeAcceptRoute,
  registerOAuthAuthorizeDenyRoute,
} from './oauth';

describe('oauth routes', () => {
  describe('GET /api/workplace_search/oauth/authorize', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/oauth/authorize',
      });

      registerOAuthAuthorizeRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/oauth/authorize',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          query: {
            access_type: 'offline',
            client_id: 'SomeClientUID',
            code_challenge: 'SomeRandomString',
            code_challenge_method: 'plain',
            response_type: 'code',
            response_mode: 'query',
            redirect_uri: 'https://my.domain/callback',
            scope: 'search',
            state: 'someRandomString',
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('POST /api/workplace_search/oauth/authorize', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/oauth/authorize',
      });

      registerOAuthAuthorizeAcceptRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/oauth/authorize',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            client_id: 'SomeClientUID',
            response_type: 'code',
            redirect_uri: 'https://my.domain/callback',
            scope: 'search',
            state: 'someRandomString',
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('DELETE /api/workplace_search/oauth/authorize', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/workplace_search/oauth/authorize',
      });

      registerOAuthAuthorizeDenyRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/oauth/authorize',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            client_id: 'SomeClientUID',
            response_type: 'code',
            redirect_uri: 'https://my.domain/callback',
            scope: 'search',
            state: 'someRandomString',
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });
});
