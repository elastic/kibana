/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObjectType } from '@kbn/config-schema';
import {
  IClusterClient,
  IRouter,
  IScopedClusterClient,
  kibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteConfig,
} from '../../../../../../src/core/server';
import { LICENSE_CHECK_STATE } from '../../../../licensing/server';
import { Authentication, AuthenticationResult } from '../../authentication';
import { ConfigType } from '../../config';
import { defineChangeUserPasswordRoutes } from './change_password';

import {
  elasticsearchServiceMock,
  loggingServiceMock,
  httpServiceMock,
  httpServerMock,
} from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { authorizationMock } from '../../authorization/index.mock';
import { authenticationMock } from '../../authentication/index.mock';

describe('Change password', () => {
  let router: jest.Mocked<IRouter>;
  let authc: jest.Mocked<Authentication>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClusterClient: jest.Mocked<IScopedClusterClient>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let mockContext: RequestHandlerContext;

  function checkPasswordChangeAPICall(
    username: string,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>
  ) {
    expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
    expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
    expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
      'shield.changePassword',
      { username, body: { password: 'new-password' } }
    );
  }

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    authc = authenticationMock.create();

    authc.getCurrentUser.mockResolvedValue(mockAuthenticatedUser({ username: 'user' }));
    authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));

    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

    mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ check: LICENSE_CHECK_STATE.Valid }) },
      },
    } as unknown) as RequestHandlerContext;

    defineChangeUserPasswordRoutes({
      router,
      clusterClient: mockClusterClient,
      basePath: httpServiceMock.createBasePath(),
      logger: loggingServiceMock.create().get(),
      config: { authc: { providers: ['saml'] } } as ConfigType,
      authc,
      authz: authorizationMock.create(),
      csp: httpServiceMock.createSetupContract().csp,
    });

    const [changePasswordRouteConfig, changePasswordRouteHandler] = router.post.mock.calls[0];
    routeConfig = changePasswordRouteConfig;
    routeHandler = changePasswordRouteHandler;
  });

  it('correctly defines route.', async () => {
    expect(routeConfig.path).toBe('/internal/security/users/{username}/password');

    const paramsSchema = (routeConfig.validate as any).params as ObjectType;
    expect(() => paramsSchema.validate({})).toThrowErrorMatchingInlineSnapshot(
      `"[username]: expected value of type [string] but got [undefined]"`
    );
    expect(() => paramsSchema.validate({ username: '' })).toThrowErrorMatchingInlineSnapshot(
      `"[username]: value is [] but it must have a minimum length of [1]."`
    );
    expect(() =>
      paramsSchema.validate({ username: 'a'.repeat(1025) })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[username]: value is [aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] but it must have a maximum length of [1024]."`
    );

    const bodySchema = (routeConfig.validate as any).body as ObjectType;
    expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
      `"[newPassword]: expected value of type [string] but got [undefined]"`
    );
    expect(() => bodySchema.validate({ newPassword: '' })).toThrowErrorMatchingInlineSnapshot(
      `"[newPassword]: value is [] but it must have a minimum length of [1]."`
    );
    expect(() =>
      bodySchema.validate({ newPassword: '123456', password: '' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[password]: value is [] but it must have a minimum length of [1]."`
    );
  });

  describe('own password', () => {
    const username = 'user';
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { username },
      body: { password: 'old-password', newPassword: 'new-password' },
    });

    it('returns 403 if old password is wrong.', async () => {
      const loginFailureReason = new Error('Something went wrong.');
      authc.login.mockResolvedValue(AuthenticationResult.failed(loginFailureReason));

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(403);
      expect(response.payload).toEqual(loginFailureReason);
      expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
    });

    it(`returns 401 if user can't authenticate with new password.`, async () => {
      const loginFailureReason = new Error('Something went wrong.');
      authc.login.mockImplementation(async (request, attempt) => {
        const credentials = attempt.value as { username: string; password: string };
        if (credentials.username === 'user' && credentials.password === 'new-password') {
          return AuthenticationResult.failed(loginFailureReason);
        }

        return AuthenticationResult.succeeded(mockAuthenticatedUser());
      });

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(401);
      expect(response.payload).toEqual(loginFailureReason);

      checkPasswordChangeAPICall(username, mockRequest);
    });

    it('returns 500 if password update request fails.', async () => {
      const failureReason = new Error('Request failed.');
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(failureReason);

      checkPasswordChangeAPICall(username, mockRequest);
    });

    it('successfully changes own password if provided old password is correct.', async () => {
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();

      checkPasswordChangeAPICall(username, mockRequest);
    });
  });

  describe('other user password', () => {
    const username = 'target-user';
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { username },
      body: { newPassword: 'new-password' },
    });

    it('returns 500 if password update request fails.', async () => {
      const failureReason = new Error('Request failed.');
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(failureReason);
      expect(authc.login).not.toHaveBeenCalled();

      checkPasswordChangeAPICall(username, mockRequest);
    });

    it('successfully changes user password.', async () => {
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();
      expect(authc.login).not.toHaveBeenCalled();

      checkPasswordChangeAPICall(username, mockRequest);
    });
  });
});
