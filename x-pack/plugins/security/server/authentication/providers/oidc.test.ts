/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import Boom from 'boom';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import {
  MockAuthenticationProviderOptions,
  mockAuthenticationProviderOptions,
  mockScopedClusterClient,
} from './base.mock';

import { KibanaRequest } from '../../../../../../src/core/server';
import { OIDCAuthenticationProvider, OIDCAuthenticationFlow, ProviderLoginAttempt } from './oidc';

describe('OIDCAuthenticationProvider', () => {
  let provider: OIDCAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
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
      const request = httpServerMock.createKibanaRequest({ path: '/api/security/oidc' });

      mockOptions.client.callAsInternalUser.withArgs('shield.oidcPrepare').resolves({
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

      const authenticationResult = await provider.login(request, {
        flow: OIDCAuthenticationFlow.InitiatedBy3rdParty,
        iss: 'theissuer',
        loginHint: 'loginhint',
      });

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.oidcPrepare', {
        body: { iss: 'theissuer', login_hint: 'loginhint' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc' +
          '&login_hint=loginhint'
      );
      expect(authenticationResult.state).toEqual({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: '/base-path/',
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

        mockOptions.client.callAsInternalUser
          .withArgs('shield.oidcAuthenticate')
          .resolves({ access_token: 'some-token', refresh_token: 'some-refresh-token' });

        const authenticationResult = await provider.login(request, attempt, {
          state: 'statevalue',
          nonce: 'noncevalue',
          nextURL: '/base-path/some-path',
        });

        sinon.assert.calledWithExactly(
          mockOptions.client.callAsInternalUser,
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

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/base-path/some-path');
        expect(authenticationResult.state).toEqual({
          accessToken: 'some-token',
          refreshToken: 'some-refresh-token',
        });
      });

      it('fails if authentication response is presented but session state does not contain the state parameter.', async () => {
        const { request, attempt } = getMocks();

        const authenticationResult = await provider.login(request, attempt, {
          nextURL: '/base-path/some-path',
        });

        sinon.assert.notCalled(mockOptions.client.callAsInternalUser);

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toEqual(
          Boom.badRequest(
            'Response session state does not have corresponding state or nonce parameters or redirect URL.'
          )
        );
      });

      it('fails if authentication response is presented but session state does not contain redirect URL.', async () => {
        const { request, attempt } = getMocks();

        const authenticationResult = await provider.login(request, attempt, {
          state: 'statevalue',
          nonce: 'noncevalue',
        });

        sinon.assert.notCalled(mockOptions.client.callAsInternalUser);

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toEqual(
          Boom.badRequest(
            'Response session state does not have corresponding state or nonce parameters or redirect URL.'
          )
        );
      });

      it('fails if session state is not presented.', async () => {
        const { request, attempt } = getMocks();

        const authenticationResult = await provider.login(request, attempt, {});

        sinon.assert.notCalled(mockOptions.client.callAsInternalUser);

        expect(authenticationResult.failed()).toBe(true);
      });

      it('fails if authentication response is not valid.', async () => {
        const { request, attempt, expectedRedirectURI } = getMocks();

        const failureReason = new Error(
          'Failed to exchange code for Id Token using the Token Endpoint.'
        );
        mockOptions.client.callAsInternalUser
          .withArgs('shield.oidcAuthenticate')
          .returns(Promise.reject(failureReason));

        const authenticationResult = await provider.login(request, attempt, {
          state: 'statevalue',
          nonce: 'noncevalue',
          nextURL: '/base-path/some-path',
        });

        sinon.assert.calledWithExactly(
          mockOptions.client.callAsInternalUser,
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

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });
    }

    describe('authorization code flow', () => {
      defineAuthenticationFlowTests(() => ({
        request: httpServerMock.createKibanaRequest({
          path: '/api/security/oidc?code=somecodehere&state=somestatehere',
        }),
        attempt: {
          flow: OIDCAuthenticationFlow.AuthorizationCode,
          authenticationResponseURI: '/api/security/oidc?code=somecodehere&state=somestatehere',
        },
        expectedRedirectURI: '/api/security/oidc?code=somecodehere&state=somestatehere',
      }));
    });

    describe('implicit flow', () => {
      defineAuthenticationFlowTests(() => ({
        request: httpServerMock.createKibanaRequest({
          path:
            '/api/security/oidc?authenticationResponseURI=http://kibana/api/security/oidc/implicit#id_token=sometoken',
        }),
        attempt: {
          flow: OIDCAuthenticationFlow.Implicit,
          authenticationResponseURI: 'http://kibana/api/security/oidc/implicit#id_token=sometoken',
        },
        expectedRedirectURI: 'http://kibana/api/security/oidc/implicit#id_token=sometoken',
      }));
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX request that can not be authenticated to the OpenId Connect Provider.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });

      mockOptions.client.callAsInternalUser.withArgs('shield.oidcPrepare').resolves({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
      });

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
      );
      expect(authenticationResult.state).toEqual({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: '/base-path/s/foo/some-path',
      });
    });

    it('fails if OpenID Connect authentication request preparation fails.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/some-path' });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser
        .withArgs('shield.oidcPrepare')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({ authorization });
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('does not handle `authorization` header with unsupported schema even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Basic some:credentials' },
      });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      sinon.assert.notCalled(mockOptions.client.asScoped);
      expect(request.headers.authorization).toBe('Basic some:credentials');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = {
        accessToken: 'some-invalid-token',
        refreshToken: 'some-invalid-refresh-token',
      };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      const failureReason = new Error('Token is not valid!');
      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'valid-refresh-token' };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: 'Bearer new-access-token' } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      mockOptions.tokens.refresh
        .withArgs(tokenPair.refreshToken)
        .resolves({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({
        authorization: 'Bearer new-access-token',
      });
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('fails if token from the state is expired and refresh attempt failed too.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'invalid-refresh-token' };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      const refreshFailureReason = {
        statusCode: 500,
        message: 'Something is wrong with refresh token.',
      };
      mockOptions.tokens.refresh.withArgs(tokenPair.refreshToken).rejects(refreshFailureReason);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(refreshFailureReason);
    });

    it('redirects to OpenID Connect Provider for non-AJAX requests if refresh token is expired or already refreshed.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'expired-refresh-token' };

      mockOptions.client.callAsInternalUser.withArgs('shield.oidcPrepare').resolves({
        state: 'statevalue',
        nonce: 'noncevalue',
        redirect:
          'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc',
      });

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.oidcPrepare', {
        body: { realm: `oidc1` },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://op-host/path/login?response_type=code' +
          '&scope=openid%20profile%20email' +
          '&client_id=s6BhdRkqt3' +
          '&state=statevalue' +
          '&redirect_uri=https%3A%2F%2Ftest-hostname:1234%2Ftest-base-path%2Fapi%2Fsecurity%2Fv1%2F/oidc'
      );
      expect(authenticationResult.state).toEqual({
        state: 'statevalue',
        nonce: 'noncevalue',
        nextURL: '/base-path/s/foo/some-path',
      });
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'expired-refresh-token' };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    });

    it('succeeds if `authorization` contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const authorization = 'Bearer some-valid-token';
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toBeUndefined();
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from `authorization` header is rejected.', async () => {
      const authorization = 'Bearer some-invalid-token';
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      const failureReason = { statusCode: 401 };
      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if token from `authorization` header is rejected even if state contains a valid one.', async () => {
      const user = mockAuthenticatedUser();
      const authorization = 'Bearer some-invalid-token';
      const request = httpServerMock.createKibanaRequest({ headers: { authorization } });

      const failureReason = { statusCode: 401 };
      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(failureReason);

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: 'Bearer some-valid-token' } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      let deauthenticateResult = await provider.logout(request, {});
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.logout(request, {});
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.logout(request, { nonce: 'x' });
      expect(deauthenticateResult.notHandled()).toBe(true);

      sinon.assert.notCalled(mockOptions.client.callAsInternalUser);
    });

    it('fails if OpenID Connect logout call fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser
        .withArgs('shield.oidcLogout')
        .returns(Promise.reject(failureReason));

      const authenticationResult = await provider.logout(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.oidcLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /logged_out if `redirect` field in OpenID Connect logout response is null.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      mockOptions.client.callAsInternalUser
        .withArgs('shield.oidcLogout')
        .resolves({ redirect: null });

      const authenticationResult = await provider.logout(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.oidcLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });

    it('redirects user to the OpenID Connect Provider if RP initiated SLO is supported.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-oidc-token';
      const refreshToken = 'x-oidc-refresh-token';

      mockOptions.client.callAsInternalUser
        .withArgs('shield.oidcLogout')
        .resolves({ redirect: 'http://fake-idp/logout&id_token_hint=thehint' });

      const authenticationResult = await provider.logout(request, {
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/logout&id_token_hint=thehint');
    });
  });
});
