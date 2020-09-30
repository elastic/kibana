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

import {
  LegacyElasticsearchErrorHelpers,
  ILegacyClusterClient,
  KibanaRequest,
  ScopeableRequest,
} from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { KerberosAuthenticationProvider } from './kerberos';

function expectAuthenticateCall(
  mockClusterClient: jest.Mocked<ILegacyClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
  expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');
}

describe('KerberosAuthenticationProvider', () => {
  let provider: KerberosAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'kerberos' });
    provider = new KerberosAuthenticationProvider(mockOptions);
  });

  function defineCommonLoginAndAuthenticateTests(
    operation: (request: KibanaRequest) => Promise<AuthenticationResult>
  ) {
    it('does not handle requests that can be authenticated without `Negotiate` header.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue({});
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
    });

    it('does not handle requests if backend does not support Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
    });

    it('fails with `Negotiate` challenge if backend supports Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (errors.AuthenticationException as any)('Unauthorized', {
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
        })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.failed(failureReason, {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
    });

    it('fails if request authentication is failed with non-401 error.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const failureReason = new errors.ServiceUnavailable();
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
    });

    it('gets a token pair in exchange to SPNEGO one and stores it in the state.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'kerberos' },
          {
            authHeaders: { authorization: 'Bearer some-token' },
            state: { accessToken: 'some-token', refreshToken: 'some-refresh-token' },
          }
        )
      );

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: 'Bearer some-token' },
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('requests auth response header if token pair is complemented with Kerberos response token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
        kerberos_authentication_response_token: 'response-token',
      });

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'kerberos' },
          {
            authHeaders: { authorization: 'Bearer some-token' },
            authResponseHeaders: { 'WWW-Authenticate': 'Negotiate response-token' },
            state: { accessToken: 'some-token', refreshToken: 'some-refresh-token' },
          }
        )
      );

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: 'Bearer some-token' },
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('fails with `Negotiate response-token` if cannot complete context with a response token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (errors.AuthenticationException as any)('Unauthorized', {
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate response-token' } } },
        })
      );
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate response-token' },
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('fails with `Negotiate` if cannot create context using provided SPNEGO token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (errors.AuthenticationException as any)('Unauthorized', {
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
        })
      );
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('fails if could not retrieve an access token in exchange to SPNEGO one.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('fails if could not retrieve user using the new access token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: 'Bearer some-token' },
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });
  }

  describe('`login` method', () => {
    defineCommonLoginAndAuthenticateTests((request) => provider.login(request));
  });

  describe('`authenticate` method', () => {
    defineCommonLoginAndAuthenticateTests((request) => provider.authenticate(request, null));

    it('does not handle authentication via `authorization` header with non-negotiate scheme.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not handle authentication via `authorization` header with non-negotiate scheme even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('fails if state is present, but backend does not support Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'token', refreshToken: 'refresh-token' };

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);
    });

    it('does not start SPNEGO if request does not require authentication.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const authorization = `Bearer ${tokenPair.accessToken}`;
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'kerberos' },
          { authHeaders: { authorization } }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      mockOptions.client.asScoped.mockImplementation((scopeableRequest) => {
        if (scopeableRequest?.headers.authorization === `Bearer ${tokenPair.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer newfoo') {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
      });

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'kerberos' },
          {
            authHeaders: { authorization: 'Bearer newfoo' },
            state: { accessToken: 'newfoo', refreshToken: 'newbar' },
          }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const failureReason = new errors.InternalServerError('Token is not valid!');
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Bearer ${tokenPair.accessToken}` },
      });

      expect(mockScopedClusterClient.callAsInternalUser).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails with `Negotiate` challenge if both access and refresh tokens from the state are expired and backend supports Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'some-valid-refresh-token' };

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (errors.AuthenticationException as any)('Unauthorized', {
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
        })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(failureReason, {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);
    });

    it('does not re-start SPNEGO if both access and refresh tokens from the state are expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false });
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'some-valid-refresh-token' };

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
        new (errors.AuthenticationException as any)('Unauthorized', {
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
        })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request)).resolves.toEqual(DeauthenticationResult.notHandled());

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('redirects to logged out view if state is `null`.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request, null)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

      await expect(provider.logout(request, tokenPair)).resolves.toEqual(
        DeauthenticationResult.failed(failureReason)
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);
    });

    it('redirects to `loggedOut` URL if tokens are invalidated successfully.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      await expect(provider.logout(request, tokenPair)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
