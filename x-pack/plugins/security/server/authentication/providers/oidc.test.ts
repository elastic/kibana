/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

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
import { OIDCAuthenticationProvider, OIDCLogin, ProviderLoginAttempt } from './oidc';

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

describe('OIDCAuthenticationProvider', () => {
  let provider: OIDCAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'oidc' });
    provider = new OIDCAuthenticationProvider(mockOptions, { realm: 'oidc1' });
  });

  it('throws if `realm` option is not specified', () => {
    const providerOptions = mockAuthenticationProviderOptions();

    expect(() => new OIDCAuthenticationProvider(providerOptions)).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new OIDCAuthenticationProvider(providerOptions, {})).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new OIDCAuthenticationProvider(providerOptions, { realm: '' })).toThrowError(
      'Realm name must be specified'
    );
  });

  describe('`login` method', () => {
    it('redirects third party initiated login attempts to the OpenId Connect Provider.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/api/security/oidc/callback' });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc' +
          '&login_hint=loginhint',
      });

      await expect(
        provider.login(request, {
          type: OIDCLogin.LoginInitiatedBy3rdParty,
          iss: 'theissuer',
          loginHint: 'loginhint',
        })
      ).resolves.toEqual(
        AuthenticationResult.redirectTo(
          'https://op-host/path/login?response_type=code' +
            '&scope=openid%20profile%20email' +
            '&client_id=s6BhdRkqt3' +
            '&state=statevalue' +
            '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc' +
            '&login_hint=loginhint',
          {
            state: {
              state: 'statevalue',
              nonce: 'noncevalue',
              nextURL: '/mock-server-basepath/',
              realm: 'oidc1',
            },
          }
        )
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcPrepare', {
        body: { iss: 'theissuer', login_hint: 'loginhint' },
      });
    });

    it('redirects user initiated login attempts to the OpenId Connect Provider.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc' +
          '&login_hint=loginhint',
      });

      await expect(
        provider.login(request, {
          type: OIDCLogin.LoginInitiatedByUser,
          redirectURLPath: '/mock-server-basepath/app/super-kibana',
        })
      ).resolves.toEqual(
        AuthenticationResult.redirectTo(
          'https://op-host/path/login?response_type=code' +
            '&scope=openid%20profile%20email' +
            '&client_id=s6BhdRkqt3' +
            '&state=statevalue' +
            '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc' +
            '&login_hint=loginhint',
          {
            state: {
              state: 'statevalue',
              nonce: 'noncevalue',
              nextURL: '/mock-server-basepath/app/super-kibana',
              realm: 'oidc1',
            },
          }
        )
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcPrepare', {
        body: { realm: 'oidc1' },
      });
    });

    function defineAuthenticationFlowTests(
      getMocks: () => {
        request: KibanaRequest;
        attempt: ProviderLoginAttempt;
        expectedRedirectURI?: string;
      }
    ) {
      it('gets token and redirects user to requested URL if OIDC authentication response is valid.', async () => {
        const { request, attempt, expectedRedirectURI } = getMocks();

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          access_token: 'some-token',
          refresh_token: 'some-refresh-token',
        });

        await expect(
          provider.login(request, attempt, {
            state: 'statevalue',
            nonce: 'noncevalue',
            nextURL: '/base-path/some-path',
            realm: 'oidc1',
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo('/base-path/some-path', {
            state: {
              accessToken: 'some-token',
              refreshToken: 'some-refresh-token',
              realm: 'oidc1',
            },
          })
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
          'shield.oidcAuthenticate',
          {
            body: {
              state: 'statevalue',
              nonce: 'noncevalue',
              redirect_uri: expectedRedirectURI,
              realm: 'oidc1',
            },
          }
        );
      });

      it('fails if authentication response is presented but session state does not contain the state parameter.', async () => {
        const { request, attempt } = getMocks();

        await expect(
          provider.login(request, attempt, { nextURL: '/base-path/some-path', realm: 'oidc1' })
        ).resolves.toEqual(
          AuthenticationResult.failed(
            Boom.badRequest(
              'Response session state does not have corresponding state or nonce parameters or redirect URL.'
            )
          )
        );

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      });

      it('fails if authentication response is presented but session state does not contain redirect URL.', async () => {
        const { request, attempt } = getMocks();

        await expect(
          provider.login(request, attempt, {
            state: 'statevalue',
            nonce: 'noncevalue',
            realm: 'oidc1',
          })
        ).resolves.toEqual(
          AuthenticationResult.failed(
            Boom.badRequest(
              'Response session state does not have corresponding state or nonce parameters or redirect URL.'
            )
          )
        );

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      });

      it('fails if session state is not presented.', async () => {
        const { request, attempt } = getMocks();

        await expect(provider.login(request, attempt, {} as any)).resolves.toEqual(
          AuthenticationResult.failed(
            Boom.badRequest(
              'Response session state does not have corresponding state or nonce parameters or redirect URL.'
            )
          )
        );

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      });

      it('fails if authentication response is not valid.', async () => {
        const { request, attempt, expectedRedirectURI } = getMocks();

        const failureReason = new Error(
          'Failed to exchange code for Id Token using the Token Endpoint.'
        );
        mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

        await expect(
          provider.login(request, attempt, {
            state: 'statevalue',
            nonce: 'noncevalue',
            nextURL: '/base-path/some-path',
            realm: 'oidc1',
          })
        ).resolves.toEqual(AuthenticationResult.failed(failureReason));

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
          'shield.oidcAuthenticate',
          {
            body: {
              state: 'statevalue',
              nonce: 'noncevalue',
              redirect_uri: expectedRedirectURI,
              realm: 'oidc1',
            },
          }
        );
      });

      it('fails if realm from state is different from the realm provider is configured with.', async () => {
        const { request, attempt } = getMocks();

        await expect(provider.login(request, attempt, { realm: 'other-realm' })).resolves.toEqual(
          AuthenticationResult.failed(
            Boom.unauthorized(
              'State based on realm "other-realm", but provider with the name "oidc" is configured to use realm "oidc1".'
            )
          )
        );

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      });
    }

    describe('authorization code flow', () => {
      defineAuthenticationFlowTests(() => ({
        request: httpServerMock.createKibanaRequest({
          path: '/api/security/oidc/callback?code=somecodehere&state=somestatehere',
        }),
        attempt: {
          type: OIDCLogin.LoginWithAuthorizationCodeFlow,
          authenticationResponseURI:
            '/api/security/oidc/callback?code=somecodehere&state=somestatehere',
        },
        expectedRedirectURI: '/api/security/oidc/callback?code=somecodehere&state=somestatehere',
      }));
    });

    describe('implicit flow', () => {
      defineAuthenticationFlowTests(() => ({
        request: httpServerMock.createKibanaRequest({
          path:
            '/api/security/oidc/callback?authenticationResponseURI=http://kibana/api/security/oidc/implicit#id_token=sometoken',
        }),
        attempt: {
          type: OIDCLogin.LoginWithImplicitFlow,
          authenticationResponseURI: 'http://kibana/api/security/oidc/implicit#id_token=sometoken',
        },
        expectedRedirectURI: 'http://kibana/api/security/oidc/implicit#id_token=sometoken',
      }));
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      await expect(provider.authenticate(request, null)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );
    });

    it('does not handle non-AJAX request that does not require authentication.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );
    });

    it('redirects non-AJAX request that can not be authenticated to the OpenId Connect Provider.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
      });

      await expect(provider.authenticate(request, null)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          'https://op-host/path/login?response_type=code' +
            '&scope=openid%20profile%20email' +
            '&client_id=s6BhdRkqt3' +
            '&state=statevalue' +
            '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
          {
            state: {
              state: 'statevalue',
              nonce: 'noncevalue',
              nextURL: '/mock-server-basepath/s/foo/some-path',
              realm: 'oidc1',
            },
          }
        )
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });
    });

    it('fails if OpenID Connect authentication request preparation fails.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/some-path' });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(provider.authenticate(request, null)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });
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

      await expect(
        provider.authenticate(request, { ...tokenPair, realm: 'oidc1' })
      ).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'oidc' },
          { authHeaders: { authorization } }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('does not handle authentication via `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not handle authentication via `authorization` header even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(
        provider.authenticate(request, {
          accessToken: 'some-valid-token',
          refreshToken: 'some-valid-refresh-token',
          realm: 'oidc1',
        })
      ).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = {
        accessToken: 'some-invalid-token',
        refreshToken: 'some-invalid-refresh-token',
      };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const failureReason = new Error('Token is not valid!');
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(
        provider.authenticate(request, { ...tokenPair, realm: 'oidc1' })
      ).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'valid-refresh-token' };

      mockOptions.client.asScoped.mockImplementation((scopeableRequest) => {
        if (scopeableRequest?.headers.authorization === `Bearer ${tokenPair.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer new-access-token') {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await expect(
        provider.authenticate(request, { ...tokenPair, realm: 'oidc1' })
      ).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'oidc' },
          {
            authHeaders: { authorization: 'Bearer new-access-token' },
            state: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              realm: 'oidc1',
            },
          }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is expired and refresh attempt failed too.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'invalid-refresh-token' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const refreshFailureReason = {
        statusCode: 500,
        message: 'Something is wrong with refresh token.',
      };
      mockOptions.tokens.refresh.mockRejectedValue(refreshFailureReason);

      await expect(
        provider.authenticate(request, { ...tokenPair, realm: 'oidc1' })
      ).resolves.toEqual(AuthenticationResult.failed(refreshFailureReason as any));

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('redirects to OpenID Connect Provider for non-AJAX requests if refresh token is expired or already refreshed.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path', headers: {} });
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'expired-refresh-token' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(
        provider.authenticate(request, { ...tokenPair, realm: 'oidc1' })
      ).resolves.toEqual(
        AuthenticationResult.redirectTo(
          'https://op-host/path/login?response_type=code' +
            '&scope=openid%20profile%20email' +
            '&client_id=s6BhdRkqt3' +
            '&state=statevalue' +
            '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
          {
            state: {
              state: 'statevalue',
              nonce: 'noncevalue',
              nextURL: '/mock-server-basepath/s/foo/some-path',
              realm: 'oidc1',
            },
          }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'expired-refresh-token' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(
        provider.authenticate(request, { ...tokenPair, realm: 'oidc1' })
      ).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expectAuthenticateCall(mockOptions.client, {
        headers: { 'kbn-xsrf': 'xsrf', authorization },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails for non-AJAX requests that do not require authentication with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false, headers: {} });
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'expired-refresh-token' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(
        provider.authenticate(request, { ...tokenPair, realm: 'oidc1' })
      ).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(tokenPair.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if realm from state is different from the realm provider is configured with.', async () => {
      const request = httpServerMock.createKibanaRequest();
      await expect(provider.authenticate(request, { realm: 'other-realm' })).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.unauthorized(
            'State based on realm "other-realm", but provider with the name "oidc" is configured to use realm "oidc1".'
          )
        )
      );
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request, undefined as any)).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );

      await expect(provider.logout(request, {} as any)).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );

      await expect(provider.logout(request, { nonce: 'x', realm: 'oidc1' })).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails if OpenID Connect logout call fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(
        provider.logout(request, { accessToken, refreshToken, realm: 'oidc1' })
      ).resolves.toEqual(DeauthenticationResult.failed(failureReason));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in OpenID Connect logout response is null.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      await expect(
        provider.logout(request, { accessToken, refreshToken, realm: 'oidc1' })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('redirects user to the OpenID Connect Provider if RP initiated SLO is supported.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        redirect: 'http://fake-idp/logout&id_token_hint=thehint',
      });

      await expect(
        provider.logout(request, { accessToken, refreshToken, realm: 'oidc1' })
      ).resolves.toEqual(
        DeauthenticationResult.redirectTo('http://fake-idp/logout&id_token_hint=thehint')
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.oidcLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
