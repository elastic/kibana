/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import type { ObjectType } from '@kbn/config-schema';
import type { Headers, RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { AuthenticationResult } from '../../authentication';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { securityMock } from '../../mocks';
import type { Session } from '../../session_management';
import { sessionMock } from '../../session_management/session.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineChangeUserPasswordRoutes } from './change_password';

describe('Change password', () => {
  let router: jest.Mocked<SecurityRouter>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let mockContext: DeeplyMockedKeys<SecurityRequestHandlerContext>;

  function checkPasswordChangeAPICall(username: string, headers?: Headers) {
    expect(
      mockContext.core.elasticsearch.client.asCurrentUser.security.changePassword
    ).toHaveBeenCalledTimes(1);
    expect(
      mockContext.core.elasticsearch.client.asCurrentUser.security.changePassword
    ).toHaveBeenCalledWith(
      { username, body: { password: 'new-password' } },
      headers && { headers }
    );
  }

  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    session = sessionMock.create();
    routeParamsMock.getSession.mockReturnValue(session);

    authc = authenticationServiceMock.createStart();
    routeParamsMock.getAuthenticationService.mockReturnValue(authc);

    authc.getCurrentUser.mockReturnValue(mockAuthenticatedUser(mockAuthenticatedUser()));
    authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockAuthenticatedUser()));
    session.get.mockResolvedValue(sessionMock.createValue());

    mockContext = {
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue({ state: 'valid' }) } },
    } as any;

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
      headers: { 'some-custom-header': 'foo' }, // the test cases below assert that this custom request header is NOT included in the ES API calls
    });

    it('returns 403 if old password is wrong.', async () => {
      const changePasswordFailure = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 401, body: {} })
      );
      mockContext.core.elasticsearch.client.asCurrentUser.security.changePassword.mockRejectedValue(
        changePasswordFailure
      );

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(403);
      expect(response.payload).toEqual(changePasswordFailure);

      checkPasswordChangeAPICall(username, {
        authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
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
        authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
      });
    });

    it('returns 500 if password update request fails with non-401 error.', async () => {
      const failureReason = new Error('Request failed.');
      mockContext.core.elasticsearch.client.asCurrentUser.security.changePassword.mockRejectedValue(
        failureReason
      );

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(failureReason);

      checkPasswordChangeAPICall(username, {
        authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
      });
    });

    it('successfully changes own password if provided old password is correct.', async () => {
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();

      checkPasswordChangeAPICall(username, {
        authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
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
        authentication_provider: { type: 'token', name: 'token1' },
      });
      authc.getCurrentUser.mockReturnValue(mockUser);
      authc.login.mockResolvedValue(AuthenticationResult.succeeded(mockUser));
      session.get.mockResolvedValue(
        sessionMock.createValue({ provider: { type: 'token', name: 'token1' } })
      );

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();

      checkPasswordChangeAPICall(username, {
        authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
      });

      expect(authc.login).toHaveBeenCalledTimes(1);
      expect(authc.login).toHaveBeenCalledWith(mockRequest, {
        provider: { name: 'token1' },
        value: { username, password: 'new-password' },
      });
    });

    it('successfully changes own password but does not re-login if current session does not exist.', async () => {
      session.get.mockResolvedValue(null);
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();

      checkPasswordChangeAPICall(username, {
        authorization: `Basic ${Buffer.from(`${username}:old-password`).toString('base64')}`,
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
      mockContext.core.elasticsearch.client.asCurrentUser.security.changePassword.mockRejectedValue(
        failureReason
      );

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(failureReason);
      expect(authc.login).not.toHaveBeenCalled();

      checkPasswordChangeAPICall(username);
    });

    it('successfully changes user password.', async () => {
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(204);
      expect(response.payload).toBeUndefined();
      expect(authc.login).not.toHaveBeenCalled();

      checkPasswordChangeAPICall(username);
    });
  });
});
