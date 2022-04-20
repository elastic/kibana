/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type } from '@kbn/config-schema';
import type { RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

import type { SecurityLicense, SecurityLicenseFeatures } from '../../../common/licensing';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import {
  AuthenticationResult,
  DeauthenticationResult,
  OIDCLogin,
  SAMLLogin,
} from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { ROUTE_TAG_AUTH_FLOW, ROUTE_TAG_CAN_REDIRECT } from '../tags';
import { defineCommonRoutes } from './common';

describe('Common authentication routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let license: jest.Mocked<SecurityLicense>;
  let mockContext: SecurityRequestHandlerContext;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    license = routeParamsMock.license;
    authc = authenticationServiceMock.createStart();
    routeParamsMock.getAuthenticationService.mockReturnValue(authc);

    mockContext = {
      licensing: {
        license: { check: jest.fn().mockReturnValue({ check: 'valid' }) },
      },
    } as unknown as SecurityRequestHandlerContext;

    defineCommonRoutes(routeParamsMock);
  });

  describe('logout', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
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
      expect(routeConfig.options).toEqual({
        authRequired: false,
        tags: [ROUTE_TAG_CAN_REDIRECT, ROUTE_TAG_AUTH_FLOW],
      });
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
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
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

    it('returns current user.', async () => {
      const mockUser = mockAuthenticatedUser();
      authc.getCurrentUser.mockReturnValue(mockUser);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual(mockUser);
      expect(authc.getCurrentUser).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('login', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [acsRouteConfig, acsRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/login'
      )!;

      routeConfig = acsRouteConfig;
      routeHandler = acsRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });
      expect(routeConfig.validate).toEqual({
        body: expect.any(Type),
        query: undefined,
        params: undefined,
      });

      const bodyValidator = (routeConfig.validate as any).body as Type<any>;
      expect(
        bodyValidator.validate({
          providerType: 'saml',
          providerName: 'saml1',
          currentURL: '/some-url',
        })
      ).toEqual({
        providerType: 'saml',
        providerName: 'saml1',
        currentURL: '/some-url',
      });

      expect(
        bodyValidator.validate({
          providerType: 'saml',
          providerName: 'saml1',
          currentURL: '',
        })
      ).toEqual({
        providerType: 'saml',
        providerName: 'saml1',
        currentURL: '',
      });

      for (const [providerType, providerName] of [
        ['basic', 'basic1'],
        ['token', 'token1'],
      ]) {
        expect(
          bodyValidator.validate({
            providerType,
            providerName,
            currentURL: '',
            params: { username: 'some-user', password: 'some-password' },
          })
        ).toEqual({
          providerType,
          providerName,
          currentURL: '',
          params: { username: 'some-user', password: 'some-password' },
        });

        expect(
          bodyValidator.validate({
            providerType,
            providerName,
            currentURL: '/some-url',
            params: { username: 'some-user', password: 'some-password' },
          })
        ).toEqual({
          providerType,
          providerName,
          currentURL: '/some-url',
          params: { username: 'some-user', password: 'some-password' },
        });
      }

      expect(() => bodyValidator.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[providerType]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({ providerType: 'saml' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[providerName]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({ providerType: 'saml', providerName: 'saml1' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[currentURL]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'saml',
          providerName: 'saml1',
          currentURL: '/some-url',
          UnknownArg: 'arg',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"[UnknownArg]: definition for this key is missing"`);

      expect(() =>
        bodyValidator.validate({
          providerType: 'saml',
          providerName: 'saml1',
          currentURL: '/some-url',
          params: { username: 'some-user', password: 'some-password' },
        })
      ).toThrowErrorMatchingInlineSnapshot(`"[params]: a value wasn't expected to be present"`);

      expect(() =>
        bodyValidator.validate({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/some-url',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.username]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/some-url',
          params: { username: 'some-user' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.password]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/some-url',
          params: { password: 'some-password' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.username]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/some-url',
          params: { username: '', password: 'some-password' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.username]: value has length [0] but it must have a minimum length of [1]."`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/some-url',
          params: { username: 'some-user', password: '' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.password]: value has length [0] but it must have a minimum length of [1]."`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'token',
          providerName: 'token1',
          currentURL: '/some-url',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.username]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'token',
          providerName: 'token1',
          currentURL: '/some-url',
          params: { username: 'some-user' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.password]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'token',
          providerName: 'token1',
          currentURL: '/some-url',
          params: { password: 'some-password' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.username]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'token',
          providerName: 'token1',
          currentURL: '/some-url',
          params: { username: '', password: 'some-password' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.username]: value has length [0] but it must have a minimum length of [1]."`
      );

      expect(() =>
        bodyValidator.validate({
          providerType: 'token',
          providerName: 'token1',
          currentURL: '/some-url',
          params: { username: 'some-user', password: '' },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[params.password]: value has length [0] but it must have a minimum length of [1]."`
      );
    });

    it('returns 500 if login throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authc.login.mockRejectedValue(unhandledException);

      const request = httpServerMock.createKibanaRequest({
        body: { providerType: 'saml', providerName: 'saml1', currentURL: '/some-url' },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).rejects.toThrow(
        unhandledException
      );
    });

    it('returns 401 if login fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      authc.login.mockResolvedValue(
        AuthenticationResult.failed(failureReason, {
          authResponseHeaders: { 'WWW-Something': 'something' },
        })
      );

      const request = httpServerMock.createKibanaRequest({
        body: { providerType: 'saml', providerName: 'saml1', currentURL: '/some-url' },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 401,
        payload: failureReason,
        options: { body: failureReason, headers: { 'WWW-Something': 'something' } },
      });
    });

    it('returns 401 if login is not handled.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.notHandled());

      const request = httpServerMock.createKibanaRequest({
        body: { providerType: 'saml', providerName: 'saml1', currentURL: '/some-url' },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 401,
        payload: 'Unauthorized',
        options: {},
      });
    });

    it('returns redirect location from authentication result if any.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const request = httpServerMock.createKibanaRequest({
        body: { providerType: 'saml', providerName: 'saml1', currentURL: '/some-url' },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { location: 'http://redirect-to/path' },
        options: { body: { location: 'http://redirect-to/path' } },
      });
    });

    it('returns location extracted from `next` parameter if authentication result does not specify any.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));

      const request = httpServerMock.createKibanaRequest({
        body: {
          providerType: 'saml',
          providerName: 'saml1',
          currentURL: 'https://kibana.com/?next=/mock-server-basepath/some-url#/app/nav',
        },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { location: '/mock-server-basepath/some-url#/app/nav' },
        options: { body: { location: '/mock-server-basepath/some-url#/app/nav' } },
      });
    });

    it('returns base path if location cannot be extracted from `currentURL` parameter and authentication result does not specify any.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));

      const invalidCurrentURLs = [
        'https://kibana.com/?next=https://evil.com/mock-server-basepath/some-url#/app/nav',
        'https://kibana.com/?next=https://kibana.com:9000/mock-server-basepath/some-url#/app/nav',
        'https://kibana.com/?next=kibana.com/mock-server-basepath/some-url#/app/nav',
        'https://kibana.com/?next=//mock-server-basepath/some-url#/app/nav',
        'https://kibana.com/?next=../mock-server-basepath/some-url#/app/nav',
        'https://kibana.com/?next=/some-url#/app/nav',
        '',
      ];

      for (const currentURL of invalidCurrentURLs) {
        const request = httpServerMock.createKibanaRequest({
          body: { providerType: 'saml', providerName: 'saml1', currentURL },
        });

        await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
          status: 200,
          payload: { location: '/mock-server-basepath/' },
          options: { body: { location: '/mock-server-basepath/' } },
        });
      }
    });

    it('correctly performs SAML login.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const request = httpServerMock.createKibanaRequest({
        body: {
          providerType: 'saml',
          providerName: 'saml1',
          currentURL: 'https://kibana.com/?next=/mock-server-basepath/some-url#/app/nav',
        },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { location: 'http://redirect-to/path' },
        options: { body: { location: 'http://redirect-to/path' } },
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { name: 'saml1' },
        redirectURL: '/mock-server-basepath/some-url#/app/nav',
        value: {
          type: SAMLLogin.LoginInitiatedByUser,
          redirectURL: '/mock-server-basepath/some-url#/app/nav',
        },
      });
    });

    it('correctly performs OIDC login.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const request = httpServerMock.createKibanaRequest({
        body: {
          providerType: 'oidc',
          providerName: 'oidc1',
          currentURL: 'https://kibana.com/?next=/mock-server-basepath/some-url#/app/nav',
        },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { location: 'http://redirect-to/path' },
        options: { body: { location: 'http://redirect-to/path' } },
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { name: 'oidc1' },
        redirectURL: '/mock-server-basepath/some-url#/app/nav',
        value: {
          type: OIDCLogin.LoginInitiatedByUser,
          redirectURL: '/mock-server-basepath/some-url#/app/nav',
        },
      });
    });

    it('correctly performs Basic login.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const request = httpServerMock.createKibanaRequest({
        body: {
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: 'https://kibana.com/?next=/mock-server-basepath/some-url#/app/nav',
          params: { username: 'some-user', password: 'some-password' },
        },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { location: 'http://redirect-to/path' },
        options: { body: { location: 'http://redirect-to/path' } },
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { name: 'basic1' },
        redirectURL: '/mock-server-basepath/some-url#/app/nav',
        value: { username: 'some-user', password: 'some-password' },
      });
    });

    it('correctly performs Token login.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const request = httpServerMock.createKibanaRequest({
        body: {
          providerType: 'token',
          providerName: 'token1',
          currentURL: 'https://kibana.com/?next=/mock-server-basepath/some-url#/app/nav',
          params: { username: 'some-user', password: 'some-password' },
        },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { location: 'http://redirect-to/path' },
        options: { body: { location: 'http://redirect-to/path' } },
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { name: 'token1' },
        redirectURL: '/mock-server-basepath/some-url#/app/nav',
        value: { username: 'some-user', password: 'some-password' },
      });
    });

    it('correctly performs generic login.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const request = httpServerMock.createKibanaRequest({
        body: {
          providerType: 'some-type',
          providerName: 'some-name',
          currentURL: 'https://kibana.com/?next=/mock-server-basepath/some-url#/app/nav',
        },
      });

      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { location: 'http://redirect-to/path' },
        options: { body: { location: 'http://redirect-to/path' } },
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { name: 'some-name' },
        redirectURL: '/mock-server-basepath/some-url#/app/nav',
      });
    });
  });

  describe('acknowledge access agreement', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [acsRouteConfig, acsRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/access_agreement/acknowledge'
      )!;

      license.getFeatures.mockReturnValue({
        allowAccessAgreement: true,
      } as SecurityLicenseFeatures);

      routeConfig = acsRouteConfig;
      routeHandler = acsRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toBeUndefined();
      expect(routeConfig.validate).toBe(false);
    });

    it(`returns 403 if current license doesn't allow access agreement acknowledgement.`, async () => {
      license.getFeatures.mockReturnValue({
        allowAccessAgreement: false,
      } as SecurityLicenseFeatures);

      const request = httpServerMock.createKibanaRequest();
      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 403,
        payload: { message: `Current license doesn't support access agreement.` },
        options: { body: { message: `Current license doesn't support access agreement.` } },
      });
    });

    it('returns 500 if acknowledge throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authc.acknowledgeAccessAgreement.mockRejectedValue(unhandledException);

      const request = httpServerMock.createKibanaRequest();
      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).rejects.toThrowError(
        unhandledException
      );
    });

    it('returns 204 if successfully acknowledged.', async () => {
      authc.acknowledgeAccessAgreement.mockResolvedValue(undefined);

      const request = httpServerMock.createKibanaRequest();
      await expect(routeHandler(mockContext, request, kibanaResponseFactory)).resolves.toEqual({
        status: 204,
        options: {},
      });
    });
  });
});
