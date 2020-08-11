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

import {
  LegacyElasticsearchErrorHelpers,
  ILegacyClusterClient,
  ScopeableRequest,
} from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { SAMLAuthenticationProvider, SAMLLogin } from './saml';

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

describe('SAMLAuthenticationProvider', () => {
  let provider: SAMLAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'saml' });
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
            username: 'user',
            accessToken: 'some-token',
            refreshToken: 'some-refresh-token',
            realm: 'test-realm',
          },
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
        username: 'user',
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
      });

      provider = new SAMLAuthenticationProvider(mockOptions, {
        realm: 'test-realm',
        maxRedirectURLSize: new ByteSizeValue(100),
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
            username: 'user',
            accessToken: 'some-token',
            refreshToken: 'some-refresh-token',
            realm: 'test-realm',
          },
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
        maxRedirectURLSize: new ByteSizeValue(100),
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

        const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockImplementation(() =>
          Promise.resolve(mockAuthenticatedUser())
        );
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        mockOptions.client.callAsInternalUser.mockResolvedValue({
          username: 'user',
          access_token: 'valid-token',
          refresh_token: 'valid-refresh-token',
        });

        provider = new SAMLAuthenticationProvider(mockOptions, {
          realm: 'test-realm',
          maxRedirectURLSize: new ByteSizeValue(100),
          useRelayStateDeepLink: true,
        });
      });

      it('redirects to the home page if `useRelayStateDeepLink` is set to `false`.', async () => {
        provider = new SAMLAuthenticationProvider(mockOptions, {
          realm: 'test-realm',
          maxRedirectURLSize: new ByteSizeValue(100),
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
              username: 'user',
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
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
              username: 'user',
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
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
              username: 'user',
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
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
              username: 'user',
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
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
                username: 'user',
                accessToken: 'valid-token',
                refreshToken: 'valid-refresh-token',
                realm: 'test-realm',
              },
            }
          )
        );
      });
    });

    describe('IdP initiated login with existing session', () => {
      it('returns `notHandled` if new SAML Response is rejected.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const authorization = 'Bearer some-valid-token';

        const user = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        const failureReason = new Error('SAML response is invalid!');
        mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

        await expect(
          provider.login(
            request,
            { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: 'saml-response-xml' },
            {
              username: 'user',
              accessToken: 'some-valid-token',
              refreshToken: 'some-valid-refresh-token',
              realm: 'test-realm',
            }
          )
        ).resolves.toEqual(AuthenticationResult.notHandled());

        expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

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
          username: 'user',
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
          realm: 'test-realm',
        };
        const authorization = `Bearer ${state.accessToken}`;

        const user = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
        mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

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

        expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

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
        ['session is valid', Promise.resolve({ username: 'user' })],
        [
          'session is is expired',
          Promise.reject(LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())),
        ],
      ] as Array<[string, Promise<any>]>) {
        it(`redirects to the home page if new SAML Response is for the same user if ${description}.`, async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const state = {
            username: 'user',
            accessToken: 'existing-token',
            refreshToken: 'existing-refresh-token',
            realm: 'test-realm',
          };
          const authorization = `Bearer ${state.accessToken}`;

          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockImplementation(() => response);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

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
                username: 'user',
                accessToken: 'new-valid-token',
                refreshToken: 'new-valid-refresh-token',
                realm: 'test-realm',
              },
            })
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

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

        it(`redirects to the URL from relay state if new SAML Response is for the same user if ${description}.`, async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const state = {
            username: 'user',
            accessToken: 'existing-token',
            refreshToken: 'existing-refresh-token',
            realm: 'test-realm',
          };
          const authorization = `Bearer ${state.accessToken}`;

          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockImplementation(() => response);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          mockOptions.client.callAsInternalUser.mockResolvedValue({
            username: 'user',
            access_token: 'new-valid-token',
            refresh_token: 'new-valid-refresh-token',
          });

          mockOptions.tokens.invalidate.mockResolvedValue(undefined);

          provider = new SAMLAuthenticationProvider(mockOptions, {
            realm: 'test-realm',
            maxRedirectURLSize: new ByteSizeValue(100),
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
                username: 'user',
                accessToken: 'new-valid-token',
                refreshToken: 'new-valid-refresh-token',
                realm: 'test-realm',
              },
            })
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

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

        it(`redirects to \`overwritten_session\` if new SAML Response is for the another user if ${description}.`, async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const state = {
            username: 'user',
            accessToken: 'existing-token',
            refreshToken: 'existing-refresh-token',
            realm: 'test-realm',
          };
          const authorization = `Bearer ${state.accessToken}`;

          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockImplementation(() => response);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          mockOptions.client.callAsInternalUser.mockResolvedValue({
            username: 'new-user',
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
            AuthenticationResult.redirectTo('/mock-server-basepath/security/overwritten_session', {
              state: {
                username: 'new-user',
                accessToken: 'new-valid-token',
                refreshToken: 'new-valid-refresh-token',
                realm: 'test-realm',
              },
            })
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

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
      it('fails if redirectURLPath is not available', async () => {
        const request = httpServerMock.createKibanaRequest();

        await expect(
          provider.login(request, {
            type: SAMLLogin.LoginInitiatedByUser,
            redirectURLFragment: '#some-fragment',
          })
        ).resolves.toEqual(
          AuthenticationResult.failed(
            Boom.badRequest('State or login attempt does not include URL path to redirect to.')
          )
        );

        expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      });

      it('redirects requests to the IdP remembering combined redirect URL.', async () => {
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
              redirectURLFragment: '#some-fragment',
            },
            { redirectURL: '/test-base-path/some-path', realm: 'test-realm' }
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

      it('redirects requests to the IdP remembering combined redirect URL if path is provided in attempt.', async () => {
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
              redirectURLPath: '/test-base-path/some-path',
              redirectURLFragment: '#some-fragment',
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

      it('prepends redirect URL fragment with `#` if it does not have one.', async () => {
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
              redirectURLFragment: '../some-fragment',
            },
            { redirectURL: '/test-base-path/some-path', realm: 'test-realm' }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestId: 'some-request-id',
                redirectURL: '/test-base-path/some-path#../some-fragment',
                realm: 'test-realm',
              },
            }
          )
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
        expect(mockOptions.logger.warn).toHaveBeenCalledWith(
          'Redirect URL fragment does not start with `#`.'
        );
      });

      it('redirects requests to the IdP remembering only redirect URL path if fragment is too large.', async () => {
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
              redirectURLFragment: '#some-fragment'.repeat(10),
            },
            { redirectURL: '/test-base-path/some-path', realm: 'test-realm' }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestId: 'some-request-id',
                redirectURL: '/test-base-path/some-path',
                realm: 'test-realm',
              },
            }
          )
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
        expect(mockOptions.logger.warn).toHaveBeenCalledWith(
          'Max URL size should not exceed 100b but it was 165b. Only URL path is captured.'
        );
      });

      it('redirects requests to the IdP remembering base path if redirect URL path in attempt is too large.', async () => {
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
              redirectURLPath: `/s/foo/${'some-path'.repeat(11)}`,
              redirectURLFragment: '#some-fragment',
            },
            null
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            { state: { requestId: 'some-request-id', redirectURL: '', realm: 'test-realm' } }
          )
        );

        expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
          body: { realm: 'test-realm' },
        });

        expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
        expect(mockOptions.logger.warn).toHaveBeenCalledWith(
          'Max URL path size should not exceed 100b but it was 106b. URL is not captured.'
        );
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
              redirectURLFragment: '#some-fragment',
            },
            { redirectURL: '/test-base-path/some-path', realm: 'test-realm' }
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
          username: 'user',
          accessToken: 'some-valid-token',
          refreshToken: 'some-valid-refresh-token',
          realm: 'test-realm',
        })
      ).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('redirects non-AJAX request that can not be authenticated to the "capture fragment" page.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/internal/security/saml/capture-url-fragment',
          { state: { redirectURL: '/mock-server-basepath/s/foo/some-path', realm: 'test-realm' } }
        )
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('redirects non-AJAX request that can not be authenticated to the IdP if request path is too large.', async () => {
      const request = httpServerMock.createKibanaRequest({
        path: `/s/foo/${'some-path'.repeat(10)}`,
      });

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          'https://idp-host/path/login?SAMLRequest=some%20request%20',
          { state: { requestId: 'some-request-id', redirectURL: '', realm: 'test-realm' } }
        )
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
      expect(mockOptions.logger.warn).toHaveBeenCalledWith(
        'Max URL path size should not exceed 100b but it was 118b. URL is not captured.'
      );
    });

    it('fails if SAML request preparation fails.', async () => {
      const request = httpServerMock.createKibanaRequest({
        path: `/s/foo/${'some-path'.repeat(10)}`,
      });

      const failureReason = new Error('Realm is misconfigured!');
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(provider.authenticate(request, null)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'saml' },
          { authHeaders: { authorization } }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        username: 'user',
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const failureReason = { statusCode: 500, message: 'Token is not valid!' };
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(failureReason as any)
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        realm: 'test-realm',
      };

      mockOptions.client.asScoped.mockImplementation((scopeableRequest) => {
        if (scopeableRequest?.headers.authorization === `Bearer ${state.accessToken}`) {
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

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'saml' },
          {
            authHeaders: { authorization: 'Bearer new-access-token' },
            state: {
              username: 'user',
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              realm: 'test-realm',
            },
          }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is expired and refresh attempt failed with unknown reason too.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

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

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(refreshFailureReason as any)
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expectAuthenticateCall(mockOptions.client, {
        headers: { 'kbn-xsrf': 'xsrf', authorization },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails for non-AJAX requests that do not require authentication with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false, headers: {} });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'))
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('re-capture URL for non-AJAX requests if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path', headers: {} });
      const state = {
        username: 'user',
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/internal/security/saml/capture-url-fragment',
          { state: { redirectURL: '/mock-server-basepath/s/foo/some-path', realm: 'test-realm' } }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
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
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      mockOptions.tokens.refresh.mockResolvedValue(null);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          'https://idp-host/path/login?SAMLRequest=some%20request%20',
          { state: { requestId: 'some-request-id', redirectURL: '', realm: 'test-realm' } }
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.samlPrepare', {
        body: { realm: 'test-realm' },
      });

      expect(mockOptions.logger.warn).toHaveBeenCalledTimes(1);
      expect(mockOptions.logger.warn).toHaveBeenCalledWith(
        'Max URL path size should not exceed 100b but it was 118b. URL is not captured.'
      );
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
      await expect(provider.logout(request, {} as any)).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );
      await expect(provider.logout(request, { somethingElse: 'x' } as any)).resolves.toEqual(
        DeauthenticationResult.notHandled()
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
          username: 'user',
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
          username: 'user',
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
          username: 'user',
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
          username: 'user',
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
          username: 'user',
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
          username: 'user',
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
          username: 'user',
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
