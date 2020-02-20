/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { mockAuthenticationProviderOptions } from './base.mock';

import { BasicAuthenticationProvider } from './basic';

function generateAuthorizationHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

describe('BasicAuthenticationProvider', () => {
  let provider: BasicAuthenticationProvider;
  let mockOptions: ReturnType<typeof mockAuthenticationProviderOptions>;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
    provider = new BasicAuthenticationProvider(mockOptions);
  });

  describe('`login` method', () => {
    it('succeeds with valid login attempt, creates session and authHeaders', async () => {
      const user = mockAuthenticatedUser();
      const credentials = { username: 'user', password: 'password' };
      const authorization = generateAuthorizationHeader(credentials.username, credentials.password);

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.login(
        httpServerMock.createKibanaRequest({ headers: {} }),
        credentials
      );

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual({ authorization });
      expect(authenticationResult.authHeaders).toEqual({ authorization });
    });

    it('fails if user cannot be retrieved during login attempt', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const credentials = { username: 'user', password: 'password' };
      const authorization = generateAuthorizationHeader(credentials.username, credentials.password);

      const authenticationError = new Error('Some error');
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.login(request, credentials);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });
  });

  describe('`authenticate` method', () => {
    it('does not redirect AJAX requests that can not be authenticated to the login page.', async () => {
      // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
      // avoid triggering of redirect logic.
      const authenticationResult = await provider.authenticate(
        httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } }),
        null
      );

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX requests that can not be authenticated to the login page.', async () => {
      const authenticationResult = await provider.authenticate(
        httpServerMock.createKibanaRequest({ path: '/s/foo/some-path # that needs to be encoded' }),
        null
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/base-path/login?next=%2Fbase-path%2Fs%2Ffoo%2Fsome-path%20%23%20that%20needs%20to%20be%20encoded'
      );
    });

    it('does not handle authentication if state exists, but authorization property is missing.', async () => {
      const authenticationResult = await provider.authenticate(
        httpServerMock.createKibanaRequest(),
        {}
      );
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication via `authorization` header.', async () => {
      const authorization = generateAuthorizationHeader('user', 'password');
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe(authorization);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication via `authorization` header even if state contains valid credentials.', async () => {
      const authorization = generateAuthorizationHeader('user', 'password');
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      const authenticationResult = await provider.authenticate(request, { authorization });

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe(authorization);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('succeeds if only state is available.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const user = mockAuthenticatedUser();
      const authorization = generateAuthorizationHeader('user', 'password');

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, { authorization });

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.authHeaders).toEqual({ authorization });
    });

    it('fails if state contains invalid credentials.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const authorization = generateAuthorizationHeader('user', 'password');

      const authenticationError = new Error('Forbidden');
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, { authorization });

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.authHeaders).toBeUndefined();
      expect(authenticationResult.error).toBe(authenticationError);
    });
  });

  describe('`logout` method', () => {
    it('always redirects to the login page.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const deauthenticateResult = await provider.logout(request);
      expect(deauthenticateResult.redirected()).toBe(true);
      expect(deauthenticateResult.redirectURL).toBe('/base-path/login?msg=LOGGED_OUT');
    });

    it('passes query string parameters to the login page.', async () => {
      const request = httpServerMock.createKibanaRequest({
        query: { next: '/app/ml', msg: 'SESSION_EXPIRED' },
      });
      const deauthenticateResult = await provider.logout(request);
      expect(deauthenticateResult.redirected()).toBe(true);
      expect(deauthenticateResult.redirectURL).toBe(
        '/base-path/login?next=%2Fapp%2Fml&msg=SESSION_EXPIRED'
      );
    });
  });
});
