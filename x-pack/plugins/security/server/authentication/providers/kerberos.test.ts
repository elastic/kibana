/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { KibanaRequest, ScopeableRequest } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { MockAuthenticationProviderOptions } from './base.mock';
import { mockAuthenticationProviderOptions } from './base.mock';
import { KerberosAuthenticationProvider } from './kerberos';

function expectAuthenticateCall(
  mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
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

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(
        mockAuthenticatedUser()
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
    });

    it('does not handle requests if backend does not support Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
    });

    it('fails with `Negotiate` challenge if backend supports Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({
          statusCode: 401,
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
        })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}` },
      });
    });

    it('fails if request authentication is failed with non-401 error.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });

      const failureReason = new errors.NoLivingConnectionsError(
        'Unavailable',
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(failureReason);
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

      mockOptions.client.asInternalUser.security.getToken.mockResponse(
        // @ts-expect-error not full interface
        {
          access_token: 'some-token',
          refresh_token: 'some-refresh-token',
          authentication: user,
        }
      );

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'kerberos', name: 'kerberos' } },
          {
            authHeaders: { authorization: 'Bearer some-token' },
            state: { accessToken: 'some-token', refreshToken: 'some-refresh-token' },
          }
        )
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('requests auth response header if token pair is complemented with Kerberos response token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      mockOptions.client.asInternalUser.security.getToken.mockResponse(
        // @ts-expect-error not full interface
        {
          access_token: 'some-token',
          refresh_token: 'some-refresh-token',
          kerberos_authentication_response_token: 'response-token',
          authentication: user,
        }
      );

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'kerberos', name: 'kerberos' } },
          {
            authHeaders: { authorization: 'Bearer some-token' },
            authResponseHeaders: { 'WWW-Authenticate': 'Negotiate response-token' },
            state: { accessToken: 'some-token', refreshToken: 'some-refresh-token' },
          }
        )
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('fails with `Negotiate response-token` if cannot complete context with a response token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({
          statusCode: 401,
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate response-token' } } },
        })
      );
      mockOptions.client.asInternalUser.security.getToken.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate response-token' },
        })
      );

      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('fails with `Negotiate` if cannot create context using provided SPNEGO token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({
          statusCode: 401,
          body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
        })
      );
      mockOptions.client.asInternalUser.security.getToken.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledWith({
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
    });

    it('fails if could not retrieve an access token in exchange to SPNEGO one.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'negotiate spnego' },
      });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 401, body: {} })
      );
      mockOptions.client.asInternalUser.security.getToken.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expect(mockOptions.client.asInternalUser.security.getToken).toHaveBeenCalledWith({
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
      expect(mockOptions.client.asInternalUser.security.getToken).not.toHaveBeenCalled();
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
      expect(mockOptions.client.asInternalUser.security.getToken).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('fails if state is present, but backend does not support Kerberos.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'token', refreshToken: 'refresh-token' };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized())
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
      expect(mockOptions.client.asInternalUser.security.getToken).not.toHaveBeenCalled();
    });

    it('does not start SPNEGO for Ajax requests.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.security.getToken).not.toHaveBeenCalled();
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
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'kerberos', name: 'kerberos' } },
          { authHeaders: { authorization } }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds with a valid session even if requiring a token refresh', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'newfoo',
        refreshToken: 'newbar',
        authenticationInfo: user,
      });

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'kerberos', name: 'kerberos' } },
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

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 503, body: {} })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, tokenPair)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: `Bearer ${tokenPair.accessToken}` },
      });
      expect(mockOptions.client.asInternalUser.security.getToken).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails with `Negotiate` challenge if both access and refresh tokens from the state are expired and backend supports Kerberos.', async () => {
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 401,
            body: { error: { header: { 'WWW-Authenticate': 'Negotiate' } } },
          })
        )
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.tokens.refresh.mockResolvedValue(null);

      const nonAjaxRequest = httpServerMock.createKibanaRequest();
      const nonAjaxTokenPair = {
        accessToken: 'expired-token',
        refreshToken: 'some-valid-refresh-token',
      };
      await expect(provider.authenticate(nonAjaxRequest, nonAjaxTokenPair)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      const ajaxRequest = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      const ajaxTokenPair = {
        accessToken: 'expired-token',
        refreshToken: 'ajax-some-valid-refresh-token',
      };
      await expect(provider.authenticate(ajaxRequest, ajaxTokenPair)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      const optionalAuthRequest = httpServerMock.createKibanaRequest({ routeAuthRequired: false });
      const optionalAuthTokenPair = {
        accessToken: 'expired-token',
        refreshToken: 'optional-some-valid-refresh-token',
      };
      await expect(
        provider.authenticate(optionalAuthRequest, optionalAuthTokenPair)
      ).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized(), {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(3);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(nonAjaxTokenPair.refreshToken);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(ajaxTokenPair.refreshToken);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(optionalAuthTokenPair.refreshToken);
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
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
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
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith(tokenPair);
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
