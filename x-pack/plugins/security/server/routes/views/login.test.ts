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
import { LoginState } from '../../../common/login_state';
import { ConfigType } from '../../config';
import { defineLoginRoutes } from './login';

import { coreMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Login view routes', () => {
  let router: jest.Mocked<IRouter>;
  let license: jest.Mocked<SecurityLicense>;
  let config: ConfigType;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    license = routeParamsMock.license;
    config = routeParamsMock.config;

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
      expect(routeConfig.options).toEqual({ authRequired: 'optional' });

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

    it('redirects user to the root page if they are authenticated or login is disabled.', async () => {
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
        // Redirect if user is authenticated even if `showLogin` is `true`.
        let request = httpServerMock.createKibanaRequest({
          query,
          auth: { isAuthenticated: true },
        });
        (request as any).url = new URL(
          `${request.url.path}${request.url.search}`,
          'https://kibana.co'
        );
        license.getFeatures.mockReturnValue({ showLogin: true } as any);
        await expect(routeHandler({} as any, request, kibanaResponseFactory)).resolves.toEqual({
          options: { headers: { location: `${expectedLocation}` } },
          status: 302,
        });

        // Redirect if `showLogin` is `false` even if user is not authenticated.
        request = httpServerMock.createKibanaRequest({ query, auth: { isAuthenticated: false } });
        (request as any).url = new URL(
          `${request.url.path}${request.url.search}`,
          'https://kibana.co'
        );
        license.getFeatures.mockReturnValue({ showLogin: false } as any);
        await expect(routeHandler({} as any, request, kibanaResponseFactory)).resolves.toEqual({
          options: { headers: { location: `${expectedLocation}` } },
          status: 302,
        });
      }
    });

    it('renders view if user is not authenticated and login page can be shown.', async () => {
      license.getFeatures.mockReturnValue({ showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest({ auth: { isAuthenticated: false } });
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
        allowSubFeaturePrivileges: true,
        showLogin: true,
      });

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const expectedPayload = {
        allowLogin: true,
        layout: 'error-es-unavailable',
        showLoginForm: true,
        requiresSecureConnection: false,
        selector: { enabled: false, providers: [] },
      };
      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: expectedPayload },
        payload: expectedPayload,
        status: 200,
      });
    });

    it('returns `form` layout if it is not specified in the license.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const expectedPayload = {
        allowLogin: true,
        layout: 'form',
        showLoginForm: true,
        requiresSecureConnection: false,
        selector: { enabled: false, providers: [] },
      };
      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: expectedPayload },
        payload: expectedPayload,
        status: 200,
      });
    });

    it('returns `requiresSecureConnection: true` if `secureCookies` is enabled in config.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      config.secureCookies = true;

      const expectedPayload = expect.objectContaining({ requiresSecureConnection: true });
      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: expectedPayload },
        payload: expectedPayload,
        status: 200,
      });
    });

    it('returns `showLoginForm: true` only if either `basic` or `token` provider is enabled.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const cases: Array<[boolean, ConfigType['authc']['sortedProviders']]> = [
        [false, []],
        [true, [{ type: 'basic', name: 'basic1', options: { order: 0, showInSelector: true } }]],
        [true, [{ type: 'token', name: 'token1', options: { order: 0, showInSelector: true } }]],
      ];

      for (const [showLoginForm, sortedProviders] of cases) {
        config.authc.sortedProviders = sortedProviders;

        const expectedPayload = expect.objectContaining({ showLoginForm });
        await expect(
          routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
        ).resolves.toEqual({
          options: { body: expectedPayload },
          payload: expectedPayload,
          status: 200,
        });
      }
    });

    it('correctly returns `selector` information.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const cases: Array<[
        boolean,
        ConfigType['authc']['sortedProviders'],
        LoginState['selector']['providers']
      ]> = [
        // selector is disabled, providers shouldn't be returned.
        [
          false,
          [
            { type: 'basic', name: 'basic1', options: { order: 0, showInSelector: true } },
            { type: 'saml', name: 'saml1', options: { order: 1, showInSelector: true } },
          ],
          [],
        ],
        // selector is enabled, but only basic/token is available, providers shouldn't be returned.
        [
          true,
          [{ type: 'basic', name: 'basic1', options: { order: 0, showInSelector: true } }],
          [],
        ],
        // selector is enabled, non-basic/token providers should be returned
        [
          true,
          [
            {
              type: 'basic',
              name: 'basic1',
              options: { order: 0, showInSelector: true, description: 'some-desc1' },
            },
            {
              type: 'saml',
              name: 'saml1',
              options: { order: 1, showInSelector: true, description: 'some-desc2' },
            },
            {
              type: 'saml',
              name: 'saml2',
              options: { order: 2, showInSelector: true, description: 'some-desc3' },
            },
          ],
          [
            { type: 'saml', name: 'saml1', description: 'some-desc2' },
            { type: 'saml', name: 'saml2', description: 'some-desc3' },
          ],
        ],
        // selector is enabled, only non-basic/token providers that are enabled in selector should be returned.
        [
          true,
          [
            {
              type: 'basic',
              name: 'basic1',
              options: { order: 0, showInSelector: true, description: 'some-desc1' },
            },
            {
              type: 'saml',
              name: 'saml1',
              options: { order: 1, showInSelector: false, description: 'some-desc2' },
            },
            {
              type: 'saml',
              name: 'saml2',
              options: { order: 2, showInSelector: true, description: 'some-desc3' },
            },
          ],
          [{ type: 'saml', name: 'saml2', description: 'some-desc3' }],
        ],
      ];

      for (const [selectorEnabled, sortedProviders, expectedProviders] of cases) {
        config.authc.selector.enabled = selectorEnabled;
        config.authc.sortedProviders = sortedProviders;

        const expectedPayload = expect.objectContaining({
          selector: { enabled: selectorEnabled, providers: expectedProviders },
        });
        await expect(
          routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
        ).resolves.toEqual({
          options: { body: expectedPayload },
          payload: expectedPayload,
          status: 200,
        });
      }
    });
  });
});
