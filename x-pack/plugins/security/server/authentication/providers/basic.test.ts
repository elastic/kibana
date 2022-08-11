/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import type { ScopeableRequest } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { mockAuthenticationProviderOptions } from './base.mock';
import { BasicAuthenticationProvider } from './basic';

function generateAuthorizationHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function expectAuthenticateCall(
  mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
}

describe('BasicAuthenticationProvider', () => {
  let provider: BasicAuthenticationProvider;
  let mockOptions: ReturnType<typeof mockAuthenticationProviderOptions>;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
    mockOptions.urls.loggedOut.mockReturnValue('/some-logged-out-page');

    provider = new BasicAuthenticationProvider(mockOptions);
  });

  describe('`login` method', () => {
    it('succeeds with valid login attempt, creates session and authHeaders', async () => {
      const user = mockAuthenticatedUser();
      const credentials = { username: 'user', password: 'password' };
      const authorization = generateAuthorizationHeader(credentials.username, credentials.password);

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(
        provider.login(httpServerMock.createKibanaRequest({ headers: {} }), credentials)
      ).resolves.toEqual(
        AuthenticationResult.succeeded(user, {
          authHeaders: { authorization },
          userProfileGrant: { type: 'password', username: 'user', password: 'password' },
          state: { authorization },
        })
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
    });

    it('fails if user cannot be retrieved during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const credentials = { username: 'user', password: 'password' };
      const authorization = generateAuthorizationHeader(credentials.username, credentials.password);

      const authenticationError = new errors.ResponseError(
        securityMock.createApiResponse({ body: {} })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        authenticationError
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.login(request, credentials)).resolves.toEqual(
        AuthenticationResult.failed(authenticationError)
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });
  });

  describe('`authenticate` method', () => {
    it('does not redirect AJAX requests that can not be authenticated to the login page.', async () => {
      // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
      // avoid triggering of redirect logic.
      await expect(
        provider.authenticate(
          httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } }),
          null
        )
      ).resolves.toEqual(AuthenticationResult.notHandled());
    });

    it('does not redirect requests that do not require authentication to the login page.', async () => {
      await expect(
        provider.authenticate(httpServerMock.createKibanaRequest({ routeAuthRequired: false }))
      ).resolves.toEqual(AuthenticationResult.notHandled());
    });

    it('redirects non-AJAX requests that can not be authenticated to the login page.', async () => {
      await expect(
        provider.authenticate(
          httpServerMock.createKibanaRequest({
            path: '/s/foo/some path that needs to be encoded',
          }),
          null
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/login?next=%2Fmock-server-basepath%2Fs%2Ffoo%2Fsome%2520path%2520that%2520needs%2520to%2520be%2520encoded'
        )
      );
    });

    it('does not handle authentication if state exists, but authorization property is missing.', async () => {
      await expect(
        provider.authenticate(httpServerMock.createKibanaRequest(), {})
      ).resolves.toEqual(AuthenticationResult.notHandled());
    });

    it('does not handle authentication via `authorization` header.', async () => {
      const authorization = generateAuthorizationHeader('user', 'password');
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe(authorization);
    });

    it('does not handle authentication via `authorization` header even if state contains valid credentials.', async () => {
      const authorization = generateAuthorizationHeader('user', 'password');
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      await expect(provider.authenticate(request, { authorization })).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe(authorization);
    });

    it('succeeds if only state is available.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const user = mockAuthenticatedUser();
      const authorization = generateAuthorizationHeader('user', 'password');

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, { authorization })).resolves.toEqual(
        AuthenticationResult.succeeded(user, { authHeaders: { authorization } })
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
    });

    it('fails if state contains invalid credentials.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const authorization = generateAuthorizationHeader('user', 'password');

      const authenticationError = new errors.ResponseError(
        securityMock.createApiResponse({ body: {} })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        authenticationError
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, { authorization })).resolves.toEqual(
        AuthenticationResult.failed(authenticationError)
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });
  });

  describe('`logout` method', () => {
    it('does not handle logout if state is not present', async () => {
      await expect(provider.logout(httpServerMock.createKibanaRequest())).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );
    });

    it('redirects to the logged out URL.', async () => {
      await expect(provider.logout(httpServerMock.createKibanaRequest(), {})).resolves.toEqual(
        DeauthenticationResult.redirectTo('/some-logged-out-page')
      );

      await expect(provider.logout(httpServerMock.createKibanaRequest(), null)).resolves.toEqual(
        DeauthenticationResult.redirectTo('/some-logged-out-page')
      );
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('basic');
  });
});
