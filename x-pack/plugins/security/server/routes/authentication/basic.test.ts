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
import { Authentication, AuthenticationResult } from '../../authentication';
import { ConfigType } from '../../config';
import { defineBasicRoutes } from './basic';

import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { authenticationMock } from '../../authentication/index.mock';
import { authorizationMock } from '../../authorization/index.mock';

describe('Basic authentication routes', () => {
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

    defineBasicRoutes({
      router,
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      basePath: httpServiceMock.createBasePath(),
      logger: loggingServiceMock.create().get(),
      config: { authc: { providers: ['saml'] } } as ConfigType,
      authc,
      authz: authorizationMock.create(),
      csp: httpServiceMock.createSetupContract().csp,
    });
  });

  describe('login', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    const mockRequest = httpServerMock.createKibanaRequest({
      body: { username: 'user', password: 'password' },
    });

    beforeEach(() => {
      const [loginRouteConfig, loginRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/login'
      )!;

      routeConfig = loginRouteConfig;
      routeHandler = loginRouteHandler;
    });

    it('correctly defines route.', async () => {
      expect(routeConfig.options).toEqual({ authRequired: false });
      expect(routeConfig.validate).toEqual({
        body: expect.any(Type),
        query: undefined,
        params: undefined,
      });

      const bodyValidator = (routeConfig.validate as any).body as Type<any>;
      expect(bodyValidator.validate({ username: 'user', password: 'password' })).toEqual({
        username: 'user',
        password: 'password',
      });

      expect(() => bodyValidator.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[username]: expected value of type [string] but got [undefined]"`
      );
      expect(() => bodyValidator.validate({ username: 'user' })).toThrowErrorMatchingInlineSnapshot(
        `"[password]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        bodyValidator.validate({ password: 'password' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[username]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        bodyValidator.validate({ username: '', password: '' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[username]: value is [] but it must have a minimum length of [1]."`
      );
      expect(() =>
        bodyValidator.validate({ username: 'user', password: '' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[password]: value is [] but it must have a minimum length of [1]."`
      );
      expect(() =>
        bodyValidator.validate({ username: '', password: 'password' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[username]: value is [] but it must have a minimum length of [1]."`
      );
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      authc.login.mockRejectedValue(unhandledException);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(unhandledException);
      expect(authc.login).toHaveBeenCalledWith(mockRequest, {
        provider: 'basic',
        value: { username: 'user', password: 'password' },
      });
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      authc.login.mockResolvedValue(AuthenticationResult.failed(failureReason));

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(401);
      expect(response.payload).toEqual(failureReason);
      expect(authc.login).toHaveBeenCalledWith(mockRequest, {
        provider: 'basic',
        value: { username: 'user', password: 'password' },
      });
    });

    it('returns 401 if authentication is not handled.', async () => {
      authc.login.mockResolvedValue(AuthenticationResult.notHandled());

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(401);
      expect(response.payload).toEqual('Unauthorized');
      expect(authc.login).toHaveBeenCalledWith(mockRequest, {
        provider: 'basic',
        value: { username: 'user', password: 'password' },
      });
    });

    describe('authentication succeeds', () => {
      it(`returns user data`, async () => {
        authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));

        const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

        expect(response.status).toBe(204);
        expect(response.payload).toBeUndefined();
        expect(authc.login).toHaveBeenCalledWith(mockRequest, {
          provider: 'basic',
          value: { username: 'user', password: 'password' },
        });
      });
    });
  });
});
