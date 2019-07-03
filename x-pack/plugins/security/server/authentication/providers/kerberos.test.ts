/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import sinon from 'sinon';

import { requestFixture } from '../../__tests__/__fixtures__/request';
import { LoginAttempt } from '../login_attempt';
import { mockAuthenticationProviderOptions } from './base.mock';

import { KerberosAuthenticationProvider } from './kerberos';

describe('KerberosAuthenticationProvider', () => {
  let provider: KerberosAuthenticationProvider;
  let callWithRequest: sinon.SinonStub;
  let callWithInternalUser: sinon.SinonStub;
  let tokens: ReturnType<typeof mockAuthenticationProviderOptions>['tokens'];
  beforeEach(() => {
    const providerOptions = mockAuthenticationProviderOptions();
    callWithRequest = providerOptions.client.callWithRequest;
    callWithInternalUser = providerOptions.client.callWithInternalUser;
    tokens = providerOptions.tokens;

    provider = new KerberosAuthenticationProvider(providerOptions);
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle `authorization` header with unsupported schema even if state contains a valid token.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic some:credentials' } });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).toBe('Basic some:credentials');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests with non-empty `loginAttempt`.', async () => {
      const request = requestFixture();
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.notCalled(callWithRequest);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests that can be authenticated without `Negotiate` header.', async () => {
      const request = requestFixture();
      callWithRequest.withArgs(request, 'shield.authenticate').resolves({});

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests if backend does not support Kerberos.', async () => {
      const request = requestFixture();
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(Boom.unauthorized());
      let authenticationResult = await provider.authenticate(request, null);
      expect(authenticationResult.notHandled()).toBe(true);

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Basic'));
      authenticationResult = await provider.authenticate(request, null);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('fails if state is present, but backend does not support Kerberos.', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'token', refreshToken: 'refresh-token' };

      callWithRequest.withArgs(request, 'shield.authenticate').rejects(Boom.unauthorized());
      tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      let authenticationResult = await provider.authenticate(request, tokenPair);
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toBeUndefined();

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Basic'));

      authenticationResult = await provider.authenticate(request, tokenPair);
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('fails with `Negotiate` challenge if backend supports Kerberos.', async () => {
      const request = requestFixture();
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Negotiate'));

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toEqual(['Negotiate']);
    });

    it('fails if request authentication is failed with non-401 error.', async () => {
      const request = requestFixture();
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(Boom.serverUnavailable());

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 503);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('gets an token pair in exchange to SPNEGO one and stores it in the state.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'negotiate spnego' } });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer some-token' } }),
          'shield.authenticate'
        )
        .resolves(user);

      callWithInternalUser
        .withArgs('shield.getAccessToken')
        .resolves({ access_token: 'some-token', refresh_token: 'some-refresh-token' });

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toEqual({
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
      });
    });

    it('fails if could not retrieve an access token in exchange to SPNEGO one.', async () => {
      const request = requestFixture({ headers: { authorization: 'negotiate spnego' } });

      const failureReason = Boom.unauthorized();
      callWithInternalUser.withArgs('shield.getAccessToken').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('fails if could not retrieve user using the new access token.', async () => {
      const request = requestFixture({ headers: { authorization: 'negotiate spnego' } });

      const failureReason = Boom.unauthorized();
      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer some-token' } }),
          'shield.authenticate'
        )
        .rejects(failureReason);

      callWithInternalUser
        .withArgs('shield.getAccessToken')
        .resolves({ access_token: 'some-token', refresh_token: 'some-refresh-token' });

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: 'spnego' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects(Boom.unauthorized());

      tokens.refresh
        .withArgs(tokenPair.refreshToken)
        .resolves({ accessToken: 'newfoo', refreshToken: 'newbar' });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer newfoo' } }),
          'shield.authenticate'
        )
        .returns(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledTwice(callWithRequest);
      sinon.assert.calledOnce(tokens.refresh);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual({ accessToken: 'newfoo', refreshToken: 'newbar' });
      expect(request.headers.authorization).toEqual('Bearer newfoo');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = requestFixture();
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const failureReason = Boom.internal('Token is not valid!');
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      sinon.assert.neverCalledWith(callWithRequest, 'shield.getAccessToken');
    });

    it('fails with `Negotiate` challenge if both access and refresh tokens from the state are expired and backend supports Kerberos.', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'expired-token', refreshToken: 'some-valid-refresh-token' };

      callWithRequest.rejects(Boom.unauthorized(null, 'Negotiate'));
      tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toEqual(['Negotiate']);
    });

    it('fails with `Negotiate` challenge if both access and refresh token documents are missing and backend supports Kerberos.', async () => {
      const request = requestFixture({ headers: {} });
      const tokenPair = { accessToken: 'missing-token', refreshToken: 'missing-refresh-token' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects({
          statusCode: 500,
          body: { error: { reason: 'token document is missing and must be present' } },
        })
        .withArgs(sinon.match({ headers: {} }), 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Negotiate'));

      tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toEqual(['Negotiate']);
    });

    it('succeeds if `authorization` contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-valid-token' } });

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from `authorization` header is rejected.', async () => {
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = { statusCode: 401 };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if token from `authorization` header is rejected even if state contains a valid one.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      const failureReason = { statusCode: 401 };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }))
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });
  });

  describe('`deauthenticate` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = requestFixture();

      let deauthenticateResult = await provider.deauthenticate(request);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, null);
      expect(deauthenticateResult.notHandled()).toBe(true);

      sinon.assert.notCalled(tokens.invalidate);
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      tokens.invalidate.withArgs(tokenPair).rejects(failureReason);

      const authenticationResult = await provider.deauthenticate(request, tokenPair);

      sinon.assert.calledOnce(tokens.invalidate);
      sinon.assert.calledWithExactly(tokens.invalidate, tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to `/logged_out` page if tokens are invalidated successfully.', async () => {
      const request = requestFixture();
      const tokenPair = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };

      tokens.invalidate.withArgs(tokenPair).resolves();

      const authenticationResult = await provider.deauthenticate(request, tokenPair);

      sinon.assert.calledOnce(tokens.invalidate);
      sinon.assert.calledWithExactly(tokens.invalidate, tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });
  });
});
