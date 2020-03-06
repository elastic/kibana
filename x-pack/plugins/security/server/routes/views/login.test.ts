/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { URL } from 'url';
import { Type } from '@kbn/config-schema';
import {
  RequestHandler,
  RouteConfig,
  kibanaResponseFactory,
  IRouter,
} from '../../../../../../src/core/server';
import { SecurityLicense } from '../../../common/licensing';
import { Authentication } from '../../authentication';
import { defineLoginRoutes } from './login';

import { coreMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Login view routes', () => {
  let authc: jest.Mocked<Authentication>;
  let router: jest.Mocked<IRouter>;
  let license: jest.Mocked<SecurityLicense>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    authc = routeParamsMock.authc;
    router = routeParamsMock.router;
    license = routeParamsMock.license;

    defineLoginRoutes(routeParamsMock);
  });

  describe('View route', () => {
    let routeHandler: RequestHandler<any, any, any, 'get'>;
    let routeConfig: RouteConfig<any, any, any, 'get'>;
    beforeEach(() => {
      const [loginRouteConfig, loginRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/login'
      )!;

      routeConfig = loginRouteConfig;
      routeHandler = loginRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });

      expect(routeConfig.validate).toEqual({
        body: undefined,
        query: expect.any(Type),
        params: undefined,
      });

      const queryValidator = (routeConfig.validate as any).query as Type<any>;
      expect(queryValidator.validate({})).toEqual({});

      expect(queryValidator.validate({ next: 'some-next' })).toEqual({ next: 'some-next' });
      expect(queryValidator.validate({ msg: 'some-msg' })).toEqual({ msg: 'some-msg' });
      expect(queryValidator.validate({ next: 'some-next', msg: 'some-msg', unknown: 1 })).toEqual({
        next: 'some-next',
        msg: 'some-msg',
        unknown: 1,
      });

      expect(() => queryValidator.validate({ next: 1 })).toThrowErrorMatchingInlineSnapshot(
        `"[next]: expected value of type [string] but got [number]"`
      );

      expect(() => queryValidator.validate({ msg: 1 })).toThrowErrorMatchingInlineSnapshot(
        `"[msg]: expected value of type [string] but got [number]"`
      );
    });

    it('redirects user to the root page if they have a session already or login is disabled.', async () => {
      for (const { query, expectedLocation } of [
        { query: {}, expectedLocation: '/mock-server-basepath/' },
        {
          query: { next: '/mock-server-basepath/app/kibana' },
          expectedLocation: '/mock-server-basepath/app/kibana',
        },
        {
          query: { next: 'http://evil.com/mock-server-basepath/app/kibana' },
          expectedLocation: '/mock-server-basepath/',
        },
      ]) {
        const request = httpServerMock.createKibanaRequest({ query });
        (request as any).url = new URL(
          `${request.url.path}${request.url.search}`,
          'https://kibana.co'
        );

        // Redirect if user has an active session even if `showLogin` is `true`.
        authc.getSessionInfo.mockResolvedValue({
          provider: 'basic',
          now: 0,
          idleTimeoutExpiration: null,
          lifespanExpiration: null,
        });
        license.getFeatures.mockReturnValue({ showLogin: true } as any);
        await expect(routeHandler({} as any, request, kibanaResponseFactory)).resolves.toEqual({
          options: { headers: { location: `${expectedLocation}` } },
          status: 302,
        });

        // Redirect if `showLogin` is `false` even if user doesn't have an active session even.
        authc.getSessionInfo.mockResolvedValue(null);
        license.getFeatures.mockReturnValue({ showLogin: false } as any);
        await expect(routeHandler({} as any, request, kibanaResponseFactory)).resolves.toEqual({
          options: { headers: { location: `${expectedLocation}` } },
          status: 302,
        });
      }
    });

    it('renders view if user does not have an active session and login page can be shown.', async () => {
      authc.getSessionInfo.mockResolvedValue(null);
      license.getFeatures.mockReturnValue({ showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: {
          headers: {
            'content-security-policy':
              "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
          },
        },
        status: 200,
      });

      expect(authc.getSessionInfo).toHaveBeenCalledWith(request);
      expect(contextMock.rendering.render).toHaveBeenCalledWith({ includeUserSettings: false });
    });
  });

  describe('Login state route', () => {
    let routeHandler: RequestHandler<any, any, any, 'get'>;
    let routeConfig: RouteConfig<any, any, any, 'get'>;
    beforeEach(() => {
      const [loginStateRouteConfig, loginStateRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/login_state'
      )!;

      routeConfig = loginStateRouteConfig;
      routeHandler = loginStateRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });
      expect(routeConfig.validate).toBe(false);
    });

    it('returns only required license features.', async () => {
      license.getFeatures.mockReturnValue({
        allowLogin: true,
        allowRbac: false,
        allowRoleDocumentLevelSecurity: true,
        allowRoleFieldLevelSecurity: false,
        layout: 'error-es-unavailable',
        showLinks: false,
        showRoleMappingsManagement: true,
        showLogin: true,
      });

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: { allowLogin: true, layout: 'error-es-unavailable', showLogin: true } },
        payload: { allowLogin: true, layout: 'error-es-unavailable', showLogin: true },
        status: 200,
      });
    });

    it('returns `form` layout if it is not specified in the license.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: { allowLogin: true, layout: 'form', showLogin: true } },
        payload: { allowLogin: true, layout: 'form', showLogin: true },
        status: 200,
      });
    });
  });
});
