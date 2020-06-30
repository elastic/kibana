/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors } from 'elasticsearch';
import { ObjectType } from '@kbn/config-schema';
import {
  ILegacyClusterClient,
  IRouter,
  ILegacyScopedClusterClient,
  kibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteConfig,
  ScopeableRequest,
} from '../../../../../../src/core/server';
import { Authentication, AuthenticationResult } from '../../authentication';
import { defineChangeUserPasswordRoutes } from './change_password';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Change password', () => {
  let router: jest.Mocked<IRouter>;
  let authc: jest.Mocked<Authentication>;
  let mockClusterClient: jest.Mocked<ILegacyClusterClient>;
  let mockScopedClusterClient: jest.Mocked<ILegacyScopedClusterClient>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let mockContext: RequestHandlerContext;

  function checkPasswordChangeAPICall(username: string, request: ScopeableRequest) {
    expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
    expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
    expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
      'shield.changePassword',
      { username, body: { password: 'new-password' } }
    );
  }

  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    authc = routeParamsMock.authc;

    authc.getCurrentUser.mockReturnValue(mockAuthenticatedUser({ username: 'user' }));
    authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));
    authc.getSessionInfo.mockResolvedValue({
      now: Date.now(),
      idleTimeoutExpiration: null,
      lifespanExpiration: null,
      provider: { type: 'basic', name: 'basic' },
    });

    mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    mockClusterClient = routeParamsMock.clusterClient;
    mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

    mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ check: 'valid' }) },
      },
    } as unknown) as RequestHandlerContext;

    defineChangeUserPasswordRoutes(routeParamsMock);

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
      `"[username]: value has length [0] but it must have a minimum length of [1]."`
    );
    expect(() =>
      paramsSchema.validate({ username: 'a'.repeat(1025) })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[username]: value has length [1025] but it must have a maximum length of [1024]."`
    );

    const bodySchema = (routeConfig.validate as any).body as ObjectType;
    expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
      `"[newPassword]: expected value of type [string] but got [undefined]"`
    );
    expect(() => bodySchema.validate({ newPassword: '' })).toThrowErrorMatchingInlineSnapshot(
      `"[newPassword]: value has length [0] but it must have a minimum length of [1]."`
    );
    expect(() =>
      bodySchema.validate({ newPassword: '123456', password: '' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[password]: value has length [0] but it must have a minimum length of [1]."`
    );
  });

  describe('own password', () => {
    const username = 'user';
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { username },
      body: { password: 'old-password', newPassword: 'new-password' },
    });

    it('returns 403 if old password is wrong.', async () => {
      const changePasswordFailure = new (errors.AuthenticationException as any)('Unauthorized', {
        body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
      });
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(changePasswordFailure);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(403);
      expect(response.payload).toEqual(changePasswordFailure);

      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.asScoped).toHaveBeenCalledWith({
        headers: {
          ...mockRequest.headers,
          authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
        },
      });
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

      checkPasswordChangeAPICall(username, {
        headers: {
          ...mockRequest.headers,
          authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
        },
      });
    });

    it('returns 500 if password update request fails with non-401 error.', async () => {
      const failureReason = new Error('Request failed.');
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(failureReason);

      checkPasswordChangeAPICall(username, {
        headers: {
          ...mockRequest.headers,
          authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
        },
      });
    });

    it('successfully changes own password if provided old password is correct.', async () => {
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();

      checkPasswordChangeAPICall(username, {
        headers: {
          ...mockRequest.headers,
          authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
        },
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(mockRequest, {
        provider: { name: 'basic1' },
        value: { username, password: 'new-password' },
      });
    });

    it('successfully changes own password if provided old password is correct for non-basic provider.', async () => {
      const mockUser = mockAuthenticatedUser({
        username: 'user',
        authentication_provider: 'token1',
      });
      authc.getCurrentUser.mockReturnValue(mockUser);
      authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockUser));

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();

      checkPasswordChangeAPICall(username, {
        headers: {
          ...mockRequest.headers,
          authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
        },
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(mockRequest, {
        provider: { name: 'token1' },
        value: { username, password: 'new-password' },
      });
    });

    it('successfully changes own password but does not re-login if current session does not exist.', async () => {
      authc.getSessionInfo.mockResolvedValue(null);
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();

      checkPasswordChangeAPICall(username, {
        headers: {
          ...mockRequest.headers,
          authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
        },
      });

      expect(authc.login).not.toHaveBeenCalled();
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
