/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import sinon from 'sinon';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import {
  MockAuthenticationProviderOptions,
  mockAuthenticationProviderOptions,
  mockScopedClusterClient,
} from './base.mock';

import { SAMLAuthenticationProvider, SAMLLoginStep } from './saml';

describe('SAMLAuthenticationProvider', () => {
  let provider: SAMLAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
    provider = new SAMLAuthenticationProvider(mockOptions, { realm: 'test-realm' });
  });

  it('throws if `realm` option is not specified', () => {
    const providerOptions = mockAuthenticationProviderOptions();

    expect(() => new SAMLAuthenticationProvider(providerOptions)).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new SAMLAuthenticationProvider(providerOptions, {})).toThrowError(
      'Realm name must be specified'
    );
    expect(() => new SAMLAuthenticationProvider(providerOptions, { realm: '' })).toThrowError(
      'Realm name must be specified'
    );
  });

  describe('`login` method', () => {
    it('gets token and redirects user to requested URL if SAML Response is valid.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.withArgs('shield.samlAuthenticate').resolves({
        username: 'user',
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      const authenticationResult = await provider.login(
        request,
        {
          step: SAMLLoginStep.SAMLResponseReceived,
          samlResponse: 'saml-response-xml',
          redirectURL: '/test-base-path/some-path',
        },
        { requestId: 'some-request-id' }
      );

      sinon.assert.calledWithExactly(
        mockOptions.client.callAsInternalUser,
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/test-base-path/some-path');
      expect(authenticationResult.state).toEqual({
        username: 'user',
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
      });
    });

    it('fails if SAML Response payload is presented but state does not contain SAML Request token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const authenticationResult = await provider.login(
        request,
        {
          step: SAMLLoginStep.SAMLResponseReceived,
          samlResponse: 'saml-response-xml',
          redirectURL: '/test-base-path/some-path',
        },
        {}
      );

      sinon.assert.notCalled(mockOptions.client.callAsInternalUser);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest(
          'SAML response state does not have corresponding request id or redirect URL.'
        )
      );
    });

    it('fails if SAML Response payload is presented but state does not contain redirect URL.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const authenticationResult = await provider.login(
        request,
        { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
        { requestId: 'some-request-id' }
      );

      sinon.assert.notCalled(mockOptions.client.callAsInternalUser);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest(
          'SAML response state does not have corresponding request id or redirect URL.'
        )
      );
    });

    it('redirects to the default location if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.withArgs('shield.samlAuthenticate').resolves({
        access_token: 'idp-initiated-login-token',
        refresh_token: 'idp-initiated-login-refresh-token',
      });

      const authenticationResult = await provider.login(request, {
        step: SAMLLoginStep.SAMLResponseReceived,
        samlResponse: 'saml-response-xml',
      });

      sinon.assert.calledWithExactly(
        mockOptions.client.callAsInternalUser,
        'shield.samlAuthenticate',
        { body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' } }
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/');
      expect(authenticationResult.state).toEqual({
        accessToken: 'idp-initiated-login-token',
        refreshToken: 'idp-initiated-login-refresh-token',
      });
    });

    it('fails if SAML Response is rejected.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const failureReason = new Error('SAML response is stale!');
      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlAuthenticate')
        .rejects(failureReason);

      const authenticationResult = await provider.login(
        request,
        {
          step: SAMLLoginStep.SAMLResponseReceived,
          samlResponse: 'saml-response-xml',
          redirectURL: '/test-base-path/some-path',
        },
        { requestId: 'some-request-id' }
      );

      sinon.assert.calledWithExactly(
        mockOptions.client.callAsInternalUser,
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    describe('IdP initiated login with existing session', () => {
      it('fails if new SAML Response is rejected.', async () => {
        const request = httpServerMock.createKibanaRequest();

        const user = mockAuthenticatedUser();
        mockScopedClusterClient(mockOptions.client)
          .callAsCurrentUser.withArgs('shield.authenticate')
          .resolves(user);

        const failureReason = new Error('SAML response is invalid!');
        mockOptions.client.callAsInternalUser
          .withArgs('shield.samlAuthenticate')
          .rejects(failureReason);

        const authenticationResult = await provider.login(
          request,
          { samlResponse: 'saml-response-xml' },
          {
            username: 'user',
            accessToken: 'some-valid-token',
            refreshToken: 'some-valid-refresh-token',
          }
        );

        sinon.assert.calledWithExactly(
          mockOptions.client.callAsInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' } }
        );

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('fails if fails to invalidate existing access/refresh tokens.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const state = {
          username: 'user',
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        };

        const user = mockAuthenticatedUser();
        mockScopedClusterClient(mockOptions.client)
          .callAsCurrentUser.withArgs('shield.authenticate')
          .resolves(user);

        mockOptions.client.callAsInternalUser.withArgs('shield.samlAuthenticate').resolves({
          username: 'user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
        });

        const failureReason = new Error('Failed to invalidate token!');
        mockOptions.tokens.invalidate.rejects(failureReason);

        const authenticationResult = await provider.login(
          request,
          { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
          state
        );

        sinon.assert.calledWithExactly(
          mockOptions.client.callAsInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' } }
        );

        sinon.assert.calledOnce(mockOptions.tokens.invalidate);
        sinon.assert.calledWithExactly(mockOptions.tokens.invalidate, {
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('redirects to the home page if new SAML Response is for the same user.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const state = {
          username: 'user',
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        };

        const user = { username: 'user' };
        mockScopedClusterClient(mockOptions.client)
          .callAsCurrentUser.withArgs('shield.authenticate')
          .resolves(user);

        mockOptions.client.callAsInternalUser.withArgs('shield.samlAuthenticate').resolves({
          username: 'user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
        });

        mockOptions.tokens.invalidate.resolves();

        const authenticationResult = await provider.login(
          request,
          { samlResponse: 'saml-response-xml' },
          state
        );

        sinon.assert.calledWithExactly(
          mockOptions.client.callAsInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' } }
        );

        sinon.assert.calledOnce(mockOptions.tokens.invalidate);
        sinon.assert.calledWithExactly(mockOptions.tokens.invalidate, {
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/base-path/');
      });

      it('redirects to `overwritten_session` if new SAML Response is for the another user.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const state = {
          username: 'user',
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        };

        const existingUser = { username: 'user' };
        mockScopedClusterClient(
          mockOptions.client,
          sinon.match({ headers: { authorization: `Bearer ${state.accessToken}` } })
        )
          .callAsCurrentUser.withArgs('shield.authenticate')
          .resolves(existingUser);

        mockOptions.client.callAsInternalUser.withArgs('shield.samlAuthenticate').resolves({
          username: 'new-user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
        });

        mockOptions.tokens.invalidate.resolves();

        const authenticationResult = await provider.login(
          request,
          { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
          state
        );

        sinon.assert.calledWithExactly(
          mockOptions.client.callAsInternalUser,
          'shield.samlAuthenticate',
          { body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' } }
        );

        sinon.assert.calledOnce(mockOptions.tokens.invalidate);
        sinon.assert.calledWithExactly(mockOptions.tokens.invalidate, {
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/base-path/overwritten_session');
      });
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle `authorization` header with unsupported schema even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Basic some:credentials' },
      });

      const authenticationResult = await provider.authenticate(request, {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      sinon.assert.notCalled(mockOptions.client.asScoped);
      expect(request.headers.authorization).toBe('Basic some:credentials');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX request that can not be authenticated to the IdP.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });

      mockOptions.client.callAsInternalUser.withArgs('shield.samlPrepare').resolves({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({
        requestId: 'some-request-id',
        nextURL: `/base-path/s/foo/some-path`,
      });
    });

    it('fails if SAML request preparation fails.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/some-path' });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.withArgs('shield.samlPrepare').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, null);

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const state = {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient(mockOptions.client, sinon.match({ headers: { authorization } }))
        .callAsCurrentUser.withArgs('shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, state);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({ authorization });
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const failureReason = { statusCode: 500, message: 'Token is not valid!' };
      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${state.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, state);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
      };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${state.accessToken}` } })
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
        .withArgs(state.refreshToken)
        .resolves({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });

      const authenticationResult = await provider.authenticate(request, state);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({
        authorization: 'Bearer new-access-token',
      });
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toEqual({
        username: 'user',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('fails if token from the state is expired and refresh attempt failed with unknown reason too.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
      };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${state.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      const refreshFailureReason = {
        statusCode: 500,
        message: 'Something is wrong with refresh token.',
      };
      mockOptions.tokens.refresh.withArgs(state.refreshToken).rejects(refreshFailureReason);

      const authenticationResult = await provider.authenticate(request, state);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(refreshFailureReason);
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      };

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${state.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh.withArgs(state.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, state);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    });

    it('initiates SAML handshake for non-AJAX requests if access token document is missing.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      };

      mockOptions.client.callAsInternalUser.withArgs('shield.samlPrepare').resolves({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${state.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({
          statusCode: 500,
          body: { error: { reason: 'token document is missing and must be present' } },
        });

      mockOptions.tokens.refresh.withArgs(state.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, state);

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({
        requestId: 'some-request-id',
        nextURL: `/base-path/s/foo/some-path`,
      });
    });

    it('initiates SAML handshake for non-AJAX requests if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      };

      mockOptions.client.callAsInternalUser.withArgs('shield.samlPrepare').resolves({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      mockScopedClusterClient(
        mockOptions.client,
        sinon.match({ headers: { authorization: `Bearer ${state.accessToken}` } })
      )
        .callAsCurrentUser.withArgs('shield.authenticate')
        .rejects({ statusCode: 401 });

      mockOptions.tokens.refresh.withArgs(state.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, state);

      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({
        requestId: 'some-request-id',
        nextURL: `/base-path/s/foo/some-path`,
      });
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

      let deauthenticateResult = await provider.logout(request);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.logout(request, {} as any);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.logout(request, { somethingElse: 'x' } as any);
      expect(deauthenticateResult.notHandled()).toBe(true);

      sinon.assert.notCalled(mockOptions.client.callAsInternalUser);
    });

    it('fails if SAML logout call fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.withArgs('shield.samlLogout').rejects(failureReason);

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if SAML invalidate call fails.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlInvalidate')
        .rejects(failureReason);

      const authenticationResult = await provider.logout(request);

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(
        mockOptions.client.callAsInternalUser,
        'shield.samlInvalidate',
        { body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' } }
      );

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is null.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlLogout')
        .resolves({ redirect: null });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlLogout')
        .resolves({ redirect: undefined });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('relies on SAML logout if query string is not empty, but does not include SAMLRequest.', async () => {
      const request = httpServerMock.createKibanaRequest({
        query: { Whatever: 'something unrelated' },
      });
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlLogout')
        .resolves({ redirect: null });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(mockOptions.client.callAsInternalUser, 'shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('relies on SAML invalidate call even if access token is presented.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlInvalidate')
        .resolves({ redirect: null });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken: 'x-saml-token',
        refreshToken: 'x-saml-refresh-token',
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(
        mockOptions.client.callAsInternalUser,
        'shield.samlInvalidate',
        { body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' } }
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is null.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlInvalidate')
        .resolves({ redirect: null });

      const authenticationResult = await provider.logout(request);

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(
        mockOptions.client.callAsInternalUser,
        'shield.samlInvalidate',
        { body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' } }
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlInvalidate')
        .resolves({ redirect: undefined });

      const authenticationResult = await provider.logout(request);

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      sinon.assert.calledWithExactly(
        mockOptions.client.callAsInternalUser,
        'shield.samlInvalidate',
        { body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' } }
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of SP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlLogout')
        .resolves({ redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H' });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of IdP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser
        .withArgs('shield.samlInvalidate')
        .resolves({ redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H' });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken: 'x-saml-token',
        refreshToken: 'x-saml-refresh-token',
      });

      sinon.assert.calledOnce(mockOptions.client.callAsInternalUser);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });
  });
});
