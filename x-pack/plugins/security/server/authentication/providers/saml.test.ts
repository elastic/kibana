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
  ILegacyScopedClusterClient,
} from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { SAMLAuthenticationProvider, SAMLLogin } from './saml';
import { AuthenticatedUser } from '../../../common/model';

describe('SAMLAuthenticationProvider', () => {
  let provider: SAMLAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  let mockUser: AuthenticatedUser;
  let mockScopedClusterClient: jest.Mocked<ILegacyScopedClusterClient>;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'saml' });

    mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    mockUser = mockAuthenticatedUser({ authentication_provider: 'saml' });
    mockScopedClusterClient.callAsCurrentUser.mockImplementation(async (method) => {
      if (method === 'shield.authenticate') {
        return mockUser;
      }

      throw new Error(`Unexpected call to ${method}!`);
    });
    mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

    provider = new SAMLAuthenticationProvider(mockOptions, {
      realm: 'test-realm',
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

  describe('`login` method', () => {
    it('gets token and redirects user to requested URL if SAML Response is valid.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      await expect(
        provider.login(
          request,
          { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
          {
            requestId: 'some-request-id',
            redirectURL: '/test-base-path/some-path#some-app',
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/test-base-path/some-path#some-app', {
          state: {
            accessToken: 'some-token',
            refreshToken: 'some-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );
    });

    it('gets token and redirects user to the requested URL if SAML Response is valid ignoring Relay State.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      provider = new SAMLAuthenticationProvider(mockOptions, {
        realm: 'test-realm',
        useRelayStateDeepLink: true,
      });
      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          },
          {
            requestId: 'some-request-id',
            redirectURL: '/test-base-path/some-path#some-app',
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/test-base-path/some-path#some-app', {
          state: {
            accessToken: 'some-token',
            refreshToken: 'some-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );
    });

    it('fails if SAML Response payload is presented but state does not contain SAML Request token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(
        provider.login(
          request,
          { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
          {} as any
        )
      ).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.badRequest('SAML response state does not have corresponding request id.')
        )
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails if realm from state is different from the realm provider is configured with.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(
        provider.login(
          request,
          { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
          { realm: 'other-realm' }
        )
      ).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.unauthorized(
            'State based on realm "other-realm", but provider with the name "saml" is configured to use realm "test-realm".'
          )
        )
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('redirects to the default location if state contains empty redirect URL.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'user-initiated-login-token',
        refresh_token: 'user-initiated-login-refresh-token',
      });

      await expect(
        provider.login(
          request,
          { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
          { requestId: 'some-request-id', redirectURL: '', realm: 'test-realm' }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/mock-server-basepath/', {
          state: {
            accessToken: 'user-initiated-login-token',
            refreshToken: 'user-initiated-login-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );
    });

    it('redirects to the default location if state contains empty redirect URL ignoring Relay State.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'user-initiated-login-token',
        refresh_token: 'user-initiated-login-refresh-token',
      });

      provider = new SAMLAuthenticationProvider(mockOptions, {
        realm: 'test-realm',
        useRelayStateDeepLink: true,
      });
      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          },
          { requestId: 'some-request-id', redirectURL: '', realm: 'test-realm' }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/mock-server-basepath/', {
          state: {
            accessToken: 'user-initiated-login-token',
            refreshToken: 'user-initiated-login-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );
    });

    it('redirects to the default location if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        access_token: 'idp-initiated-login-token',
        refresh_token: 'idp-initiated-login-refresh-token',
      });

      await expect(
        provider.login(request, {
          type: SAMLLogin.LoginWithSAMLResponse,
          samlResponse: 'saml-response-xml',
        })
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/mock-server-basepath/', {
          state: {
            accessToken: 'idp-initiated-login-token',
            refreshToken: 'idp-initiated-login-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' } }
      );
    });

    it('fails if SAML Response is rejected.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const failureReason = new Error('SAML response is stale!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(
        provider.login(
          request,
          { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
          {
            requestId: 'some-request-id',
            redirectURL: '/test-base-path/some-path',
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
        'shield.samlAuthenticate',
        { body: { ids: ['some-request-id'], content: 'saml-response-xml', realm: 'test-realm' } }
      );
    });

    describe('IdP initiated login', () => {
      beforeEach(() => {
        mockOptions.basePath.get.mockReturnValue(mockOptions.basePath.serverBasePath);

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          username: 'user',
          access_token: 'valid-token',
          refresh_token: 'valid-refresh-token',
        });

        provider = new SAMLAuthenticationProvider(mockOptions, {
          realm: 'test-realm',
          useRelayStateDeepLink: true,
        });
      });

      it('redirects to the home page if `useRelayStateDeepLink` is set to `false`.', async () => {
        provider = new SAMLAuthenticationProvider(mockOptions, {
          realm: 'test-realm',
          useRelayStateDeepLink: false,
        });

        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('redirects to the home page if `relayState` is not specified.', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('redirects to the home page if `relayState` includes external URL', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `https://evil.com${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('redirects to the home page if `relayState` includes URL that starts with double slashes', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `//${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('redirects to the URL from the relay state.', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
            {
              state: {
                accessToken: 'valid-token',
                refreshToken: 'valid-refresh-token',
                realm: 'test-realm',
              },
              user: mockUser,
            }
          )
        );
      });
    });

    describe('IdP initiated login with existing session', () => {
      it('returns `notHandled` if new SAML Response is rejected.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const authorization = 'Bearer some-valid-token';

        const failureReason = new Error('SAML response is invalid!');
        mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

        await expect(
          provider.login(
            request,
            { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
            {
              accessToken: 'some-valid-token',
              refreshToken: 'some-valid-refresh-token',
              realm: 'test-realm',
            }
          )
        ).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith(
          'shield.samlAuthenticate',
          {
            body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' },
          }
        );
      });

      it('fails if fails to invalidate existing access/refresh tokens.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
          realm: 'test-realm',
        };
        const authorization = `Bearer ${state.accessToken}`;

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          username: 'user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
        });

        const failureReason = new Error('Failed to invalidate token!');
        mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

        await expect(
          provider.login(
            request,
            { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
            state
          )
        ).resolves.toEqual(AuthenticationResult.failed(failureReason));

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
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
      });

      for (const [description, response] of [
        [
          'current session is valid',
          Promise.resolve(mockAuthenticatedUser({ authentication_provider: 'saml' })),
        ],
        [
          'current session is is expired',
          Promise.reject(LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())),
        ],
      ] as Array<[string, Promise<any>]>) {
        it(`redirects to the home page if ${description}.`, async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const state = {
            accessToken: 'existing-token',
            refreshToken: 'existing-refresh-token',
            realm: 'test-realm',
          };
          const authorization = `Bearer ${state.accessToken}`;

          // The first call is made using tokens from existing session.
          mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(() => response);
          // The second call is made using new tokens.
          mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(() =>
            Promise.resolve(mockUser)
          );

          mockOptions.client.callAsInternalUser.mockResolvedValue({
            username: 'user',
            access_token: 'new-valid-token',
            refresh_token: 'new-valid-refresh-token',
          });

          mockOptions.tokens.invalidate.mockResolvedValue(undefined);

          await expect(
            provider.login(
              request,
              { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
              state
            )
          ).resolves.toEqual(
            AuthenticationResult.redirectTo('/mock-server-basepath/', {
              state: {
                accessToken: 'new-valid-token',
                refreshToken: 'new-valid-refresh-token',
                realm: 'test-realm',
              },
              user: mockUser,
            })
          );

          expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
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
        });

        it(`redirects to the URL from relay state if ${description}.`, async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const state = {
            accessToken: 'existing-token',
            refreshToken: 'existing-refresh-token',
            realm: 'test-realm',
          };
          const authorization = `Bearer ${state.accessToken}`;

          // The first call is made using tokens from existing session.
          mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(() => response);
          // The second call is made using new tokens.
          mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(() =>
            Promise.resolve(mockUser)
          );

          mockOptions.client.callAsInternalUser.mockResolvedValue({
            username: 'user',
            access_token: 'new-valid-token',
            refresh_token: 'new-valid-refresh-token',
          });

          mockOptions.tokens.invalidate.mockResolvedValue(undefined);

          provider = new SAMLAuthenticationProvider(mockOptions, {
            realm: 'test-realm',
            useRelayStateDeepLink: true,
          });

          await expect(
            provider.login(
              request,
              {
                type: SAMLLogin.LoginWithSAMLResponse,
                samlResponse: 'saml-response-xml',
                relayState: '/mock-server-basepath/app/some-app#some-deep-link',
              },
              state
            )
          ).resolves.toEqual(
            AuthenticationResult.redirectTo('/mock-server-basepath/app/some-app#some-deep-link', {
              state: {
                accessToken: 'new-valid-token',
                refreshToken: 'new-valid-refresh-token',
                realm: 'test-realm',
              },
              user: mockUser,
            })
          );

          expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
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
        });
      }
    });

    describe('User initiated login with captured redirect URL', () => {
      it('fails if redirectURL is not valid', async () => {
        const request = httpServerMock.createKibanaRequest();

        await expect(
          provider.login(request, {
            type: SAMLLogin.LoginInitiatedByUser,
            redirectURL: '',
          })
        ).resolves.toEqual(
          AuthenticationResult.failed(
            Boom.badRequest('Login attempt should include non-empty `redirectURL` string.')
          )
        );

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      });

      it('redirects requests to the IdP remembering redirect URL with existing state.', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
        });

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginInitiatedByUser,
              redirectURL: '/test-base-path/some-path#some-fragment',
            },
            { realm: 'test-realm' }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestId: 'some-request-id',
                redirectURL: '/test-base-path/some-path#some-fragment',
                realm: 'test-realm',
              },
            }
          )
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).not.toHaveBeenCalled();
      });

      it('redirects requests to the IdP remembering redirect URL without state.', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
        });

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginInitiatedByUser,
              redirectURL: '/test-base-path/some-path#some-fragment',
            },
            null
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestId: 'some-request-id',
                redirectURL: '/test-base-path/some-path#some-fragment',
                realm: 'test-realm',
              },
            }
          )
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).not.toHaveBeenCalled();
      });

      it('fails if SAML request preparation fails.', async () => {
        const request = httpServerMock.createKibanaRequest();

        const failureReason = new Error('Realm is misconfigured!');
        mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginInitiatedByUser,
              redirectURL: '/test-base-path/some-path#some-fragment',
            },
            { realm: 'test-realm' }
          )
        ).resolves.toEqual(AuthenticationResult.failed(failureReason));

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });
      });
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
          realm: 'test-realm',
        })
      ).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('redirects non-AJAX request that can not be authenticated to the "capture URL" page.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/internal/security/capture-url?next=%2Fmock-server-basepath%2Fs%2Ffoo%2Fsome-path&providerType=saml&providerName=saml',
          { state: null }
        )
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('succeeds if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(mockUser, { authHeaders: { authorization } })
      );

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const failureReason = { statusCode: 500, message: 'Token is not valid!' };
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(failureReason as any)
      );

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        realm: 'test-realm',
      };

      mockOptions.client.asScoped.mockImplementation((scopeableRequest) => {
        if (scopeableRequest?.headers.authorization === `Bearer ${state.accessToken}`) {
          const mockScopedClusterClientToFail = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClientToFail.callAsCurrentUser.mockRejectedValue(
            LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
          );
          return mockScopedClusterClientToFail;
        }

        if (scopeableRequest?.headers.authorization === 'Bearer new-access-token') {
          return mockScopedClusterClient;
        }

        throw new Error('Unexpected call');
      });

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(mockUser, {
          authHeaders: { authorization: 'Bearer new-access-token' },
          state: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            realm: 'test-realm',
          },
        })
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is expired and refresh attempt failed with unknown reason too.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );

      const refreshFailureReason = {
        statusCode: 500,
        message: 'Something is wrong with refresh token.',
      };
      mockOptions.tokens.refresh.mockRejectedValue(refreshFailureReason);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(refreshFailureReason as any)
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { 'kbn-xsrf': 'xsrf', authorization },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails for non-AJAX requests that do not require authentication with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false, headers: {} });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('re-capture URL for non-AJAX requests if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path', headers: {} });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/internal/security/capture-url?next=%2Fmock-server-basepath%2Fs%2Ffoo%2Fsome-path&providerType=saml&providerName=saml',
          { state: null }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails if realm from state is different from the realm provider is configured with.', async () => {
      const request = httpServerMock.createKibanaRequest();
      await expect(provider.authenticate(request, { realm: 'other-realm' })).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.unauthorized(
            'State based on realm "other-realm", but provider with the name "saml" is configured to use realm "test-realm".'
          )
        )
      );
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request)).resolves.toEqual(DeauthenticationResult.notHandled());

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('redirects to logged out view if state is `null` or does not include access token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request, null)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );
      await expect(provider.logout(request, { somethingElse: 'x' } as any)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails if SAML logout call fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.failed(failureReason));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('fails if SAML invalidate call fails.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.failed(failureReason)
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML logout response is null.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML logout response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: undefined });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('relies on SAML logout if query string is not empty, but does not include SAMLRequest.', async () => {
      const request = httpServerMock.createKibanaRequest({
        query: { Whatever: 'something unrelated', SAMLResponse: 'xxx yyy' },
      });
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlLogout', {
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('relies on SAML invalidate call even if access token is presented.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      await expect(
        provider.logout(request, {
          accessToken: 'x-saml-token',
          refreshToken: 'x-saml-refresh-token',
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML invalidate response is null.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: null });

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML invalidate response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({ redirect: undefined });

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlInvalidate', {
        body: { queryString: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });
    });

    it('redirects to `loggedOut` URL if SAML logout response is received.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLResponse: 'xxx yyy' } });

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of SP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H',
      });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(
        DeauthenticationResult.redirectTo('http://fake-idp/SLO?SAMLRequest=7zlH37H')
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of IdP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H',
      });

      await expect(
        provider.logout(request, {
          accessToken: 'x-saml-token',
          refreshToken: 'x-saml-refresh-token',
          realm: 'test-realm',
        })
      ).resolves.toEqual(
        DeauthenticationResult.redirectTo('http://fake-idp/SLO?SAMLRequest=7zlH37H')
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
