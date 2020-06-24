/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '@kbn/config-schema';
import { Authentication, AuthenticationResult, SAMLLogin } from '../../authentication';
import { defineSAMLRoutes } from './saml';
import { IRouter, RequestHandler, RouteConfig } from '../../../../../../src/core/server';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('SAML authentication routes', () => {
  let router: jest.Mocked<IRouter>;
  let authc: jest.Mocked<Authentication>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    authc = routeParamsMock.authc;

    defineSAMLRoutes(routeParamsMock);
  });

  describe('Assertion consumer service endpoint', () => {
    let routeHandler: RequestHandler<any, any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [acsRouteConfig, acsRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/api/security/saml/callback'
      )!;

      routeConfig = acsRouteConfig;
      routeHandler = acsRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false, xsrfRequired: false });
      expect(routeConfig.validate).toEqual({
        body: expect.any(Type),
        query: undefined,
        params: undefined,
      });

      const bodyValidator = (routeConfig.validate as any).body as Type<any>;
      expect(bodyValidator.validate({ SAMLResponse: 'saml-response' })).toEqual({
        SAMLResponse: 'saml-response',
      });

      expect(bodyValidator.validate({ SAMLResponse: 'saml-response', RelayState: '' })).toEqual({
        SAMLResponse: 'saml-response',
        RelayState: '',
      });

      expect(
        bodyValidator.validate({ SAMLResponse: 'saml-response', RelayState: 'relay-state' })
      ).toEqual({ SAMLResponse: 'saml-response', RelayState: 'relay-state' });

      expect(() => bodyValidator.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[SAMLResponse]: expected value of type [string] but got [undefined]"`
      );

      expect(bodyValidator.validate({ SAMLResponse: 'saml-response', UnknownArg: 'arg' })).toEqual({
        SAMLResponse: 'saml-response',
      });
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authc.login.mockRejectedValue(unhandledException);

      const internalServerErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.internalError.mockReturnValue(internalServerErrorResponse as any);

      const request = httpServerMock.createKibanaRequest({
        body: { SAMLResponse: 'saml-response' },
      });

      await expect(routeHandler({} as any, request, responseFactory)).resolves.toBe(
        internalServerErrorResponse
      );

      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { type: 'saml' },
        value: {
          type: SAMLLogin.LoginWithSAMLResponse,
          samlResponse: 'saml-response',
        },
      });
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      authc.login.mockResolvedValue(AuthenticationResult.failed(failureReason));

      const unauthorizedErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.unauthorized.mockReturnValue(unauthorizedErrorResponse as any);

      await expect(
        routeHandler(
          {} as any,
          httpServerMock.createKibanaRequest({ body: { SAMLResponse: 'saml-response' } }),
          responseFactory
        )
      ).resolves.toBe(unauthorizedErrorResponse);

      expect(responseFactory.unauthorized).toHaveBeenCalledWith({ body: failureReason });
    });

    it('returns 401 if authentication is not handled.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.notHandled());

      const unauthorizedErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.unauthorized.mockReturnValue(unauthorizedErrorResponse as any);

      await expect(
        routeHandler(
          {} as any,
          httpServerMock.createKibanaRequest({ body: { SAMLResponse: 'saml-response' } }),
          responseFactory
        )
      ).resolves.toBe(unauthorizedErrorResponse);

      expect(responseFactory.unauthorized).toHaveBeenCalledWith({ body: undefined });
    });

    it('returns 401 if authentication completes with unexpected result.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));

      const unauthorizedErrorResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.unauthorized.mockReturnValue(unauthorizedErrorResponse as any);

      await expect(
        routeHandler(
          {} as any,
          httpServerMock.createKibanaRequest({ body: { SAMLResponse: 'saml-response' } }),
          responseFactory
        )
      ).resolves.toBe(unauthorizedErrorResponse);

      expect(responseFactory.unauthorized).toHaveBeenCalledWith({ body: undefined });
    });

    it('redirects if required by the authentication process.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const redirectResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.redirected.mockReturnValue(redirectResponse as any);

      const request = httpServerMock.createKibanaRequest({
        body: { SAMLResponse: 'saml-response' },
      });

      await expect(routeHandler({} as any, request, responseFactory)).resolves.toBe(
        redirectResponse
      );

      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { type: 'saml' },
        value: {
          type: SAMLLogin.LoginWithSAMLResponse,
          samlResponse: 'saml-response',
        },
      });

      expect(responseFactory.redirected).toHaveBeenCalledWith({
        headers: { location: 'http://redirect-to/path' },
      });
    });

    it('passes `RelayState` within login attempt.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.redirectTo('http://redirect-to/path'));

      const redirectResponse = Symbol('error');
      const responseFactory = httpServerMock.createResponseFactory();
      responseFactory.redirected.mockReturnValue(redirectResponse as any);

      const request = httpServerMock.createKibanaRequest({
        body: { SAMLResponse: 'saml-response', RelayState: '/app/kibana' },
      });

      await expect(routeHandler({} as any, request, responseFactory)).resolves.toBe(
        redirectResponse
      );

      expect(authc.login).toHaveBeenCalledWith(request, {
        provider: { type: 'saml' },
        value: {
          type: SAMLLogin.LoginWithSAMLResponse,
          samlResponse: 'saml-response',
          relayState: '/app/kibana',
        },
      });

      expect(responseFactory.redirected).toHaveBeenCalledWith({
        headers: { location: 'http://redirect-to/path' },
      });
    });
  });
});
