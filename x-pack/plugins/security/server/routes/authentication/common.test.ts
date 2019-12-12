/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '@kbn/config-schema';
import {
  IRouter,
  kibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteConfig,
} from '../../../../../../src/core/server';
import { LICENSE_CHECK_STATE } from '../../../../licensing/server';
import { Authentication, DeauthenticationResult } from '../../authentication';
import { ConfigType } from '../../config';
import { LegacyAPI } from '../../plugin';
import { defineCommonRoutes } from './common';

import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { authenticationMock } from '../../authentication/index.mock';
import { authorizationMock } from '../../authorization/index.mock';

describe('Common authentication routes', () => {
  let router: jest.Mocked<IRouter>;
  let authc: jest.Mocked<Authentication>;
  let mockContext: RequestHandlerContext;
  beforeEach(() => {
    router = httpServiceMock.createRouter();
    authc = authenticationMock.create();

    mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ check: LICENSE_CHECK_STATE.Valid }) },
      },
    } as unknown) as RequestHandlerContext;

    defineCommonRoutes({
      router,
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      basePath: httpServiceMock.createBasePath(),
      logger: loggingServiceMock.create().get(),
      config: { authc: { providers: ['saml'] } } as ConfigType,
      authc,
      authz: authorizationMock.create(),
      getLegacyAPI: () => ({ cspRules: 'test-csp-rule' } as LegacyAPI),
    });
  });

  describe('logout', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    const mockRequest = httpServerMock.createKibanaRequest({
      body: { username: 'user', password: 'password' },
    });

    beforeEach(() => {
      const [loginRouteConfig, loginRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/api/security/logout'
      )!;

      routeConfig = loginRouteConfig;
      routeHandler = loginRouteHandler;
    });

    it('correctly defines route.', async () => {
      expect(routeConfig.options).toEqual({ authRequired: false });
      expect(routeConfig.validate).toEqual({
        body: undefined,
        query: expect.any(Type),
        params: undefined,
      });

      const queryValidator = (routeConfig.validate as any).query as Type<any>;
      expect(queryValidator.validate({ someRandomField: 'some-random' })).toEqual({
        someRandomField: 'some-random',
      });
      expect(queryValidator.validate({})).toEqual({});
      expect(queryValidator.validate(undefined)).toEqual({});
    });

    it('returns 500 if deauthentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authc.logout.mockRejectedValue(unhandledException);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(unhandledException);
      expect(authc.logout).toHaveBeenCalledWith(mockRequest);
    });

    it('returns 500 if authenticator fails to logout.', async () => {
      const failureReason = new Error('Something went wrong.');
      authc.logout.mockResolvedValue(DeauthenticationResult.failed(failureReason));

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(failureReason);
      expect(authc.logout).toHaveBeenCalledWith(mockRequest);
    });

    it('returns 400 for AJAX requests that can not handle redirect.', async () => {
      const mockAjaxRequest = httpServerMock.createKibanaRequest({
        headers: { 'kbn-xsrf': 'xsrf' },
      });

      const response = await routeHandler(mockContext, mockAjaxRequest, kibanaResponseFactory);

      expect(response.status).toBe(400);
      expect(response.payload).toEqual('Client should be able to process redirect response.');
      expect(authc.logout).not.toHaveBeenCalled();
    });

    it('redirects user to the URL returned by authenticator.', async () => {
      authc.logout.mockResolvedValue(DeauthenticationResult.redirectTo('https://custom.logout'));

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(302);
      expect(response.payload).toBeUndefined();
      expect(response.options).toEqual({ headers: { location: 'https://custom.logout' } });
      expect(authc.logout).toHaveBeenCalledWith(mockRequest);
    });

    it('redirects user to the base path if deauthentication succeeds.', async () => {
      authc.logout.mockResolvedValue(DeauthenticationResult.succeeded());

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(302);
      expect(response.payload).toBeUndefined();
      expect(response.options).toEqual({ headers: { location: '/mock-server-basepath/' } });
      expect(authc.logout).toHaveBeenCalledWith(mockRequest);
    });

    it('redirects user to the base path if deauthentication is not handled.', async () => {
      authc.logout.mockResolvedValue(DeauthenticationResult.notHandled());

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(302);
      expect(response.payload).toBeUndefined();
      expect(response.options).toEqual({ headers: { location: '/mock-server-basepath/' } });
      expect(authc.logout).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('me', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    const mockRequest = httpServerMock.createKibanaRequest({
      body: { username: 'user', password: 'password' },
    });

    beforeEach(() => {
      const [loginRouteConfig, loginRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/me'
      )!;

      routeConfig = loginRouteConfig;
      routeHandler = loginRouteHandler;
    });

    it('correctly defines route.', async () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it('returns 500 if cannot retrieve current user due to unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authc.getCurrentUser.mockRejectedValue(unhandledException);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(unhandledException);
      expect(authc.getCurrentUser).toHaveBeenCalledWith(mockRequest);
    });

    it('returns current user.', async () => {
      const mockUser = mockAuthenticatedUser();
      authc.getCurrentUser.mockResolvedValue(mockUser);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual(mockUser);
      expect(authc.getCurrentUser).toHaveBeenCalledWith(mockRequest);
    });
  });
});
