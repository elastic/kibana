/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ByteSizeValue } from '@kbn/config-schema';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { MockAuthenticationProviderOptions, mockAuthenticationProviderOptions } from './base.mock';

import { SAMLAuthenticationProvider, SAMLLoginStep } from './saml';
import { ElasticsearchErrorHelpers } from '../../../../../../src/core/server';

describe('SAMLAuthenticationProvider', () => {
  let provider: SAMLAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
    provider = new SAMLAuthenticationProvider(mockOptions, {
      realm: 'test-realm',
      maxRedirectURLSize: new ByteSizeValue(100),
    });
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

  it('throws if `maxRedirectURLSize` option is not specified', () => {
    const providerOptions = mockAuthenticationProviderOptions();

    expect(
      () => new SAMLAuthenticationProvider(providerOptions, { realm: 'test-realm' })
    ).toThrowError('Maximum redirect URL size must be specified');

    expect(
      () =>
        new SAMLAuthenticationProvider(providerOptions, {
          realm: 'test-realm',
          maxRedirectURLSize: undefined,
        })
    ).toThrowError('Maximum redirect URL size must be specified');
  });

  describe('`login` method', () => {
    it('gets token and redirects user to requested URL if SAML Response is valid.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        username: 'user',
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      const authenticationResult = await provider.login(
        request,
        { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
        { requestId: 'some-request-id', redirectURL: '/test-base-path/some-path#some-app' }
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/test-base-path/some-path#some-app');
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
        { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
        {}
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest('SAML response state does not have corresponding request id.')
      );
    });

    it('redirects to the default location if state contains empty redirect URL.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'user-initiated-login-token',
        refresh_token: 'user-initiated-login-refresh-token',
      });

      const authenticationResult = await provider.login(
        request,
        { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
        { requestId: 'some-request-id', redirectURL: '' }
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/');
      expect(authenticationResult.state).toEqual({
        accessToken: 'user-initiated-login-token',
        refreshToken: 'user-initiated-login-refresh-token',
      });
    });

    it('redirects to the default location if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'idp-initiated-login-token',
        refresh_token: 'idp-initiated-login-refresh-token',
      });

      const authenticationResult = await provider.login(request, {
        step: SAMLLoginStep.SAMLResponseReceived,
        samlResponse: 'saml-response-xml',
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
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
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.login(
        request,
        { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
        { requestId: 'some-request-id', redirectURL: '/test-base-path/some-path' }
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    describe('IdP initiated login with existing session', () => {
      it('fails if new SAML Response is rejected.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const authorization = 'Bearer some-valid-token';

        const user = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        const failureReason = new Error('SAML response is invalid!');
        mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

        const authenticationResult = await provider.login(
          request,
          { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
          {
            username: 'user',
            accessToken: 'some-valid-token',
            refreshToken: 'some-valid-refresh-token',
          }
        );

        expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization },
        });
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.authenticate'
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
          'shield.samlAuthenticate',
          {
            body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' },
          }
        );

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('fails if fails to invalidate existing access/refresh tokens.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          username: 'user',
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        };
        const authorization = `Bearer ${state.accessToken}`;

        const user = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          username: 'user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
        });

        const failureReason = new Error('Failed to invalidate token!');
        mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

        const authenticationResult = await provider.login(
          request,
          { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
          state
        );

        expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization },
        });
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.authenticate'
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
          'shield.samlAuthenticate',
          {
            body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' },
          }
        );

        expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
        expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });

      it('redirects to the home page if new SAML Response is for the same user.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          username: 'user',
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        };
        const authorization = `Bearer ${state.accessToken}`;

        const user = { username: 'user' };
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          username: 'user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
        });

        mockOptions.tokens.invalidate.mockResolvedValue(undefined);

        const authenticationResult = await provider.login(
          request,
          { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
          state
        );

        expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization },
        });
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.authenticate'
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
          'shield.samlAuthenticate',
          {
            body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' },
          }
        );

        expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
        expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/base-path/');
      });

      it('redirects to `overwritten_session` if new SAML Response is for the another user.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          username: 'user',
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
        };
        const authorization = `Bearer ${state.accessToken}`;

        const existingUser = { username: 'user' };
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(existingUser);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          username: 'new-user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
        });

        mockOptions.tokens.invalidate.mockResolvedValue(undefined);

        const authenticationResult = await provider.login(
          request,
          { step: SAMLLoginStep.SAMLResponseReceived, samlResponse: 'saml-response-xml' },
          state
        );

        expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization },
        });
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.authenticate'
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
          'shield.samlAuthenticate',
          {
            body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' },
          }
        );

        expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
        expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe('/base-path/overwritten_session');
      });
    });

    describe('User initiated login with captured redirect URL', () => {
      it('fails if state is not available', async () => {
        const request = httpServerMock.createKibanaRequest();

        const authenticationResult = await provider.login(request, {
          step: SAMLLoginStep.RedirectURLFragmentCaptured,
          redirectURLFragment: '#some-fragment',
        });

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toEqual(
          Boom.badRequest('State does not include URL path to redirect to.')
        );
      });

      it('does not handle AJAX requests.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

        const authenticationResult = await provider.login(
          request,
          {
            step: SAMLLoginStep.RedirectURLFragmentCaptured,
            redirectURLFragment: '#some-fragment',
          },
          { redirectURL: '/test-base-path/some-path' }
        );

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

        expect(authenticationResult.notHandled()).toBe(true);
      });

      it('redirects non-AJAX requests to the IdP remembering combined redirect URL.', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
        });

        const authenticationResult = await provider.login(
          request,
          {
            step: SAMLLoginStep.RedirectURLFragmentCaptured,
            redirectURLFragment: '#some-fragment',
          },
          { redirectURL: '/test-base-path/some-path' }
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).not.toHaveBeenCalled();

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe(
          'https://idp-host/path/login?SAMLRequest=some%20request%20'
        );
        expect(authenticationResult.state).toEqual({
          requestId: 'some-request-id',
          redirectURL: '/test-base-path/some-path#some-fragment',
        });
      });

      it('prepends redirect URL fragment with `#` if it does not have one.', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
        });

        const authenticationResult = await provider.login(
          request,
          {
            step: SAMLLoginStep.RedirectURLFragmentCaptured,
            redirectURLFragment: '../some-fragment',
          },
          { redirectURL: '/test-base-path/some-path' }
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
        expect(mockOptions.logger.warn).toHaveBeenCalledWith(
          'Redirect URL fragment does not start with `#`.'
        );

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe(
          'https://idp-host/path/login?SAMLRequest=some%20request%20'
        );
        expect(authenticationResult.state).toEqual({
          requestId: 'some-request-id',
          redirectURL: '/test-base-path/some-path#../some-fragment',
        });
      });

      it('redirects non-AJAX requests to the IdP remembering only redirect URL path if fragment is too large.', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
        });

        const authenticationResult = await provider.login(
          request,
          {
            step: SAMLLoginStep.RedirectURLFragmentCaptured,
            redirectURLFragment: '#some-fragment'.repeat(10),
          },
          { redirectURL: '/test-base-path/some-path' }
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
        expect(mockOptions.logger.warn).toHaveBeenCalledWith(
          'Max URL size should not exceed 100b but it was 165b. Only URL path is captured.'
        );

        expect(authenticationResult.redirected()).toBe(true);
        expect(authenticationResult.redirectURL).toBe(
          'https://idp-host/path/login?SAMLRequest=some%20request%20'
        );
        expect(authenticationResult.state).toEqual({
          requestId: 'some-request-id',
          redirectURL: '/test-base-path/some-path',
        });
      });

      it('fails if SAML request preparation fails.', async () => {
        const request = httpServerMock.createKibanaRequest();

        const failureReason = new Error('Realm is misconfigured!');
        mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

        const authenticationResult = await provider.login(
          request,
          {
            step: SAMLLoginStep.RedirectURLFragmentCaptured,
            redirectURLFragment: '#some-fragment',
          },
          { redirectURL: '/test-base-path/some-path' }
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);
      });
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication via `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle authentication via `authorization` header even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      const authenticationResult = await provider.authenticate(request, {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      });

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX request that can not be authenticated to the "capture fragment" page.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/mock-server-basepath/api/security/saml/capture-url-fragment'
      );
      expect(authenticationResult.state).toEqual({ redirectURL: '/base-path/s/foo/some-path' });
    });

    it('redirects non-AJAX request that can not be authenticated to the IdP if request path is too large.', async () => {
      const request = httpServerMock.createKibanaRequest({
        path: `/s/foo/${'some-path'.repeat(10)}`,
      });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
      expect(mockOptions.logger.warn).toHaveBeenCalledWith(
        'Max URL path size should not exceed 100b but it was 107b. URL is not captured.'
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({ requestId: 'some-request-id', redirectURL: '' });
    });

    it('fails if SAML request preparation fails.', async () => {
      const request = httpServerMock.createKibanaRequest({
        path: `/s/foo/${'some-path'.repeat(10)}`,
      });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.authenticate(request, null);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({ authorization });
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'saml' });
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const failureReason = { statusCode: 500, message: 'Token is not valid!' };
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

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

      mockOptions.client.asScoped.mockImplementation(scopeableRequest => {
        if (scopeableRequest?.headers.authorization === `Bearer ${state.accessToken}`) {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
            ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClient;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer new-access-token') {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({
        authorization: 'Bearer new-access-token',
      });
      expect(authenticationResult.user).toEqual({ ...user, authentication_provider: 'saml' });
      expect(authenticationResult.state).toEqual({
        username: 'user',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('fails if token from the state is expired and refresh attempt failed with unknown reason too.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const refreshFailureReason = {
        statusCode: 500,
        message: 'Something is wrong with refresh token.',
      };
      mockOptions.tokens.refresh.mockRejectedValue(refreshFailureReason);

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

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
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { 'kbn-xsrf': 'xsrf', authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    });

    it('re-capture URL for non-AJAX requests if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path', headers: {} });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/mock-server-basepath/api/security/saml/capture-url-fragment'
      );
      expect(authenticationResult.state).toEqual({ redirectURL: '/base-path/s/foo/some-path' });
    });

    it('initiates SAML handshake for non-AJAX requests if refresh token is expired and request path is too large.', async () => {
      const request = httpServerMock.createKibanaRequest({
        path: `/s/foo/${'some-path'.repeat(10)}`,
        headers: {},
      });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
      expect(mockOptions.logger.warn).toHaveBeenCalledWith(
        'Max URL path size should not exceed 100b but it was 107b. URL is not captured.'
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        'https://idp-host/path/login?SAMLRequest=some%20request%20'
      );
      expect(authenticationResult.state).toEqual({ requestId: 'some-request-id', redirectURL: '' });
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

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails if SAML logout call fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if SAML invalidate call fails.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.logout(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is null.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML logout response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: undefined });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });

    it('relies on SAML logout if query string is not empty, but does not include SAMLRequest.', async () => {
      const request = httpServerMock.createKibanaRequest({
        query: { Whatever: 'something unrelated' },
      });
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });

    it('relies on SAML invalidate call even if access token is presented.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken: 'x-saml-token',
        refreshToken: 'x-saml-refresh-token',
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is null.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      const authenticationResult = await provider.logout(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });

    it('redirects to /logged_out if `redirect` field in SAML invalidate response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: undefined });

      const authenticationResult = await provider.logout(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of SP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H',
      });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken,
        refreshToken,
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of IdP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H',
      });

      const authenticationResult = await provider.logout(request, {
        username: 'user',
        accessToken: 'x-saml-token',
        refreshToken: 'x-saml-refresh-token',
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('http://fake-idp/SLO?SAMLRequest=7zlH37H');
    });
  });
});
