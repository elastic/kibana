/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { mockAuthenticationProviderOptions } from './base.mock';

import { ILegacyClusterClient, ScopeableRequest } from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from '../http_authentication';
import { AnonymousAuthenticationProvider } from './anonymous';

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

describe('AnonymousAuthenticationProvider', () => {
  const user = mockAuthenticatedUser({
    authentication_provider: { type: 'anonymous', name: 'anonymous1' },
  });

  for (const useBasicCredentials of [true, false]) {
    describe(`with ${useBasicCredentials ? '`Basic`' : '`ApiKey`'} credentials`, () => {
      let provider: AnonymousAuthenticationProvider;
      let mockOptions: ReturnType<typeof mockAuthenticationProviderOptions>;
      let authorization: string;
      beforeEach(() => {
        mockOptions = mockAuthenticationProviderOptions({ name: 'anonymous1' });

        provider = useBasicCredentials
          ? new AnonymousAuthenticationProvider(mockOptions, {
              credentials: { username: 'user', password: 'pass' },
            })
          : new AnonymousAuthenticationProvider(mockOptions, {
              credentials: { apiKey: 'some-apiKey' },
            });
        authorization = useBasicCredentials
          ? new HTTPAuthorizationHeader(
              'Basic',
              new BasicHTTPAuthorizationHeaderCredentials('user', 'pass').toString()
            ).toString()
          : new HTTPAuthorizationHeader('ApiKey', 'some-apiKey').toString();
      });

      describe('`login` method', () => {
        it('succeeds if credentials are valid, and creates session and authHeaders', async () => {
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(
            provider.login(httpServerMock.createKibanaRequest({ headers: {} }))
          ).resolves.toEqual(
            AuthenticationResult.succeeded(user, {
              authHeaders: { authorization },
              state: {},
            })
          );
          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
        });

        it('fails if user cannot be retrieved during login attempt', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });

          const authenticationError = new Error('Some error');
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.login(request)).resolves.toEqual(
            AuthenticationResult.failed(authenticationError)
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

          expect(request.headers).not.toHaveProperty('authorization');
        });
      });

      describe('`authenticate` method', () => {
        it('does not create session for AJAX requests.', async () => {
          // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
          // avoid triggering of redirect logic.
          await expect(
            provider.authenticate(
              httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } }),
              null
            )
          ).resolves.toEqual(AuthenticationResult.notHandled());
        });

        it('does not create session for request that do not require authentication.', async () => {
          await expect(
            provider.authenticate(httpServerMock.createKibanaRequest({ routeAuthRequired: false }))
          ).resolves.toEqual(AuthenticationResult.notHandled());
        });

        it('does not handle authentication via `authorization` header.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: { authorization } });
          await expect(provider.authenticate(request)).resolves.toEqual(
            AuthenticationResult.notHandled()
          );

          expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
          expect(request.headers.authorization).toBe(authorization);
        });

        it('does not handle authentication via `authorization` header even if state exists.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: { authorization } });
          await expect(provider.authenticate(request, {})).resolves.toEqual(
            AuthenticationResult.notHandled()
          );

          expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
          expect(request.headers.authorization).toBe(authorization);
        });

        it('succeeds for non-AJAX requests if state is available.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });

          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request, {})).resolves.toEqual(
            AuthenticationResult.succeeded(user, { authHeaders: { authorization } })
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
        });

        it('succeeds for AJAX requests if state is available.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request, {})).resolves.toEqual(
            AuthenticationResult.succeeded(user, { authHeaders: { authorization } })
          );

          expectAuthenticateCall(mockOptions.client, {
            headers: { authorization, 'kbn-xsrf': 'xsrf' },
          });
        });

        it('non-AJAX requests can start a new session.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });

          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request)).resolves.toEqual(
            AuthenticationResult.succeeded(user, { state: {}, authHeaders: { authorization } })
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
        });

        it('fails if credentials are not valid.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });

          const authenticationError = new Error('Forbidden');
          const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
          mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(authenticationError);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request)).resolves.toEqual(
            AuthenticationResult.failed(authenticationError)
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

          expect(request.headers).not.toHaveProperty('authorization');
        });

        if (!useBasicCredentials) {
          it('properly handles extended format for the ApiKey credentials', async () => {
            provider = new AnonymousAuthenticationProvider(mockOptions, {
              credentials: { apiKey: { id: 'some-id', key: 'some-key' } },
            });
            authorization = new HTTPAuthorizationHeader(
              'ApiKey',
              new BasicHTTPAuthorizationHeaderCredentials('some-id', 'some-key').toString()
            ).toString();

            const request = httpServerMock.createKibanaRequest({ headers: {} });

            const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
            mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
            mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

            await expect(provider.authenticate(request, {})).resolves.toEqual(
              AuthenticationResult.succeeded(user, { authHeaders: { authorization } })
            );

            expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
          });
        }
      });

      describe('`logout` method', () => {
        it('does not handle logout if state is not present', async () => {
          await expect(provider.logout(httpServerMock.createKibanaRequest())).resolves.toEqual(
            DeauthenticationResult.notHandled()
          );
        });

        it('always redirects to the logged out page.', async () => {
          await expect(provider.logout(httpServerMock.createKibanaRequest(), {})).resolves.toEqual(
            DeauthenticationResult.redirectTo('/mock-server-basepath/security/logged_out')
          );

          await expect(
            provider.logout(httpServerMock.createKibanaRequest(), null)
          ).resolves.toEqual(
            DeauthenticationResult.redirectTo('/mock-server-basepath/security/logged_out')
          );
        });
      });

      it('`getHTTPAuthenticationScheme` method', () => {
        expect(provider.getHTTPAuthenticationScheme()).toBe(
          useBasicCredentials ? 'basic' : 'apikey'
        );
      });
    });
  }
});
