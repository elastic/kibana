/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { errors } from 'elasticsearch';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { MockAuthenticationProviderOptions, mockAuthenticationProviderOptions } from './base.mock';

import { ElasticsearchErrorHelpers } from '../../../../../../src/core/server';
import { KerberosAuthenticationProvider } from './kerberos';

describe('KerberosAuthenticationProvider', () => {
  let provider: KerberosAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
    provider = new KerberosAuthenticationProvider(mockOptions);
  });

  describe('`authenticate` method', () => {
    it('does not handle authentication via `authorization` header with non-negotiate scheme.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication via `authorization` header with non-negotiate scheme even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests that can be authenticated without `Negotiate` header.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue({});
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, null);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests if backend does not support Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, null);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('fails if state is present, but backend does not support Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'token', refreshToken: 'refresh-token' };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.tokens.refresh.mockResolvedValue(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('fails with `Negotiate` challenge if backend supports Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(
          new (errors.AuthenticationException as any)('Unauthorized', {
            body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
          })
        )
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, null);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.authResponseHeaders).toEqual({ 'WWW-Authenticate': 'Negotiate' });
    });

    it('fails if request authentication is failed with non-401 error.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(new errors.ServiceUnavailable());
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('status', 503);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('gets a token pair in exchange to SPNEGO one and stores it in the state.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: 'Bearer some-token' },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'kerberos' });
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer some-token' });
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
      expect(authenticationResult.state).toEqual({
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
      });
    });

    it('requests auth response header if token pair is complemented with Kerberos response token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
        kerberos_authentication_response_token: 'response-token',
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: 'Bearer some-token' },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'kerberos' });
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer some-token' });
      expect(authenticationResult.authResponseHeaders).toEqual({
        'WWW-Authenticate': 'Negotiate response-token',
      });
      expect(authenticationResult.state).toEqual({
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
      });
    });

    it('fails with `Negotiate response-token` if cannot complete context with a response token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (errors.AuthenticationException as any)('Unauthorized', {
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate response-token' } } },
        })
      );
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(Boom.unauthorized());
      expect(authenticationResult.authResponseHeaders).toEqual({
        'WWW-Authenticate': 'Negotiate response-token',
      });
    });

    it('fails with `Negotiate` if cannot create context using provided SPNEGO token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (errors.AuthenticationException as any)('Unauthorized', {
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
        })
      );
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(Boom.unauthorized());
      expect(authenticationResult.authResponseHeaders).toEqual({
        'WWW-Authenticate': 'Negotiate',
      });
    });

    it('fails if could not retrieve an access token in exchange to SPNEGO one.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('fails if could not retrieve user using the new access token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: 'Bearer some-token' },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const authorization = `Bearer ${tokenPair.accessToken}`;
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({ authorization });
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'kerberos' });
      expect(authenticationResult.state).toBeUndefined();
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.client.asScoped.mockImplementation(scopeableRequest => {
        if (scopeableRequest?.headers.authorization === `Bearer ${tokenPair.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer newfoo') {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
      });

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer newfoo' });
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'kerberos' });
      expect(authenticationResult.state).toEqual({ accessToken: 'newfoo', refreshToken: 'newbar' });
      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const failureReason = new errors.InternalServerError('Token is not valid!');
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: `Bearer ${tokenPair.accessToken}` },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');
      expect(mockScopedClusterClient.callAsInternalUser).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails with `Negotiate` challenge if both access and refresh tokens from the state are expired and backend supports Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'some-valid-refresh-token' };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(
          new (errors.AuthenticationException as any)('Unauthorized', {
            body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
          })
        )
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.authResponseHeaders).toEqual({ 'WWW-Authenticate': 'Negotiate' });
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      let deauthenticateResult = await provider.logout(request);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.logout(request, null);
      expect(deauthenticateResult.notHandled()).toBe(true);

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

      const authenticationResult = await provider.logout(request, tokenPair);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to `/logged_out` page if tokens are invalidated successfully.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      const authenticationResult = await provider.logout(request, tokenPair);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });
  });
});
