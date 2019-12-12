/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./providers/basic', () => ({ BasicAuthenticationProvider: jest.fn() }));

import Boom from 'boom';
import { duration, Duration } from 'moment';
import { SessionStorage } from '../../../../../src/core/server';

import {
  loggingServiceMock,
  httpServiceMock,
  httpServerMock,
  elasticsearchServiceMock,
  sessionStorageMock,
} from '../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { AuthenticationResult } from './authentication_result';
import { Authenticator, AuthenticatorOptions, ProviderSession } from './authenticator';
import { DeauthenticationResult } from './deauthentication_result';
import { BasicAuthenticationProvider } from './providers';

function getMockOptions(config: Partial<AuthenticatorOptions['config']> = {}) {
  return {
    clusterClient: elasticsearchServiceMock.createClusterClient(),
    basePath: httpServiceMock.createSetupContract().basePath,
    loggers: loggingServiceMock.create(),
    isSystemAPIRequest: jest.fn(),
    config: {
      session: { idleTimeout: null, lifespan: null },
      authc: { providers: [], oidc: {}, saml: {} },
      ...config,
    },
    sessionStorageFactory: sessionStorageMock.createFactory<ProviderSession>(),
  };
}

describe('Authenticator', () => {
  let mockBasicAuthenticationProvider: jest.Mocked<PublicMethodsOf<BasicAuthenticationProvider>>;
  beforeEach(() => {
    mockBasicAuthenticationProvider = {
      login: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
    };

    jest
      .requireMock('./providers/basic')
      .BasicAuthenticationProvider.mockImplementation(() => mockBasicAuthenticationProvider);
  });

  afterEach(() => jest.clearAllMocks());

  describe('initialization', () => {
    it('fails if authentication providers are not configured.', () => {
      const mockOptions = getMockOptions({
        authc: { providers: [], oidc: {}, saml: {} },
      });
      expect(() => new Authenticator(mockOptions)).toThrowError(
        'No authentication provider is configured. Verify `xpack.security.authc.providers` config value.'
      );
    });

    it('fails if configured authentication provider is not known.', () => {
      const mockOptions = getMockOptions({
        authc: { providers: ['super-basic'], oidc: {}, saml: {} },
      });

      expect(() => new Authenticator(mockOptions)).toThrowError(
        'Unsupported authentication provider name: super-basic.'
      );
    });
  });

  describe('`login` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    let mockSessVal: any;
    beforeEach(() => {
      mockOptions = getMockOptions({
        authc: { providers: ['basic'], oidc: {}, saml: {} },
      });
      mockSessionStorage = sessionStorageMock.create();
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      mockSessVal = {
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        state: { authorization: 'Basic xxx' },
        provider: 'basic',
        path: mockOptions.basePath.serverBasePath,
      };

      authenticator = new Authenticator(mockOptions);
    });

    it('fails if request is not provided.', async () => {
      await expect(authenticator.login(undefined as any, undefined as any)).rejects.toThrowError(
        'Request should be a valid "KibanaRequest" instance, was [undefined].'
      );
    });

    it('fails if login attempt is not provided.', async () => {
      await expect(
        authenticator.login(httpServerMock.createKibanaRequest(), undefined as any)
      ).rejects.toThrowError(
        'Login attempt should be an object with non-empty "provider" property.'
      );

      await expect(
        authenticator.login(httpServerMock.createKibanaRequest(), {} as any)
      ).rejects.toThrowError(
        'Login attempt should be an object with non-empty "provider" property.'
      );
    });

    it('fails if an authentication provider fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const failureReason = new Error('Not Authorized');

      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.failed(failureReason)
      );

      const authenticationResult = await authenticator.login(request, {
        provider: 'basic',
        value: {},
      });
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('returns user that authentication provider returns.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const user = mockAuthenticatedUser();
      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.succeeded(user, { authHeaders: { authorization: 'Basic .....' } })
      );

      const authenticationResult = await authenticator.login(request, {
        provider: 'basic',
        value: {},
      });
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Basic .....' });
    });

    it('creates session whenever authentication provider returns state', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;

      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      const authenticationResult = await authenticator.login(request, {
        provider: 'basic',
        value: {},
      });
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: { authorization },
      });
    });

    it('returns `notHandled` if login attempt is targeted to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const authenticationResult = await authenticator.login(request, {
        provider: 'token',
        value: {},
      });
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('clears session if it belongs to a different provider.', async () => {
      const user = mockAuthenticatedUser();
      const credentials = { username: 'user', password: 'password' };
      const request = httpServerMock.createKibanaRequest();

      mockBasicAuthenticationProvider.login.mockResolvedValue(AuthenticationResult.succeeded(user));
      mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, provider: 'token' });

      const authenticationResult = await authenticator.login(request, {
        provider: 'basic',
        value: credentials,
      });
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);

      expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(
        request,
        credentials,
        null
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session if provider asked to do so.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();

      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: null })
      );

      const authenticationResult = await authenticator.login(request, {
        provider: 'basic',
        value: {},
      });
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    describe('stateless login', () => {
      it('does not create session even if authentication provider returns state', async () => {
        const user = mockAuthenticatedUser();
        const request = httpServerMock.createKibanaRequest();
        const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;

        mockBasicAuthenticationProvider.login.mockResolvedValue(
          AuthenticationResult.succeeded(user, { state: { authorization } })
        );

        const authenticationResult = await authenticator.login(request, {
          provider: 'basic',
          value: {},
          stateless: true,
        });
        expect(authenticationResult.succeeded()).toBe(true);
        expect(authenticationResult.user).toEqual(user);

        expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(request, {}, null);
        expect(mockSessionStorage.get).not.toHaveBeenCalled();
        expect(mockSessionStorage.set).not.toHaveBeenCalled();
        expect(mockSessionStorage.clear).not.toHaveBeenCalled();
      });

      it('does not clear session even if provider asked to do so.', async () => {
        const user = mockAuthenticatedUser();
        const request = httpServerMock.createKibanaRequest();

        mockBasicAuthenticationProvider.login.mockResolvedValue(
          AuthenticationResult.succeeded(user, { state: null })
        );

        const authenticationResult = await authenticator.login(request, {
          provider: 'basic',
          value: {},
          stateless: true,
        });
        expect(authenticationResult.succeeded()).toBe(true);
        expect(authenticationResult.user).toEqual(user);

        expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(request, {}, null);
        expect(mockSessionStorage.get).not.toHaveBeenCalled();
        expect(mockSessionStorage.set).not.toHaveBeenCalled();
        expect(mockSessionStorage.clear).not.toHaveBeenCalled();
      });

      it('does not clear session even if provider failed with 401.', async () => {
        const request = httpServerMock.createKibanaRequest();

        const failureReason = Boom.unauthorized();
        mockBasicAuthenticationProvider.login.mockResolvedValue(
          AuthenticationResult.failed(failureReason)
        );

        const authenticationResult = await authenticator.login(request, {
          provider: 'basic',
          value: {},
          stateless: true,
        });
        expect(authenticationResult.failed()).toBe(true);
        expect(authenticationResult.error).toBe(failureReason);

        expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(request, {}, null);
        expect(mockSessionStorage.get).not.toHaveBeenCalled();
        expect(mockSessionStorage.set).not.toHaveBeenCalled();
        expect(mockSessionStorage.clear).not.toHaveBeenCalled();
      });
    });
  });

  describe('`authenticate` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    let mockSessVal: any;
    beforeEach(() => {
      mockOptions = getMockOptions({
        authc: { providers: ['basic'], oidc: {}, saml: {} },
      });
      mockSessionStorage = sessionStorageMock.create<ProviderSession>();
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      mockSessVal = {
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        state: { authorization: 'Basic xxx' },
        provider: 'basic',
        path: mockOptions.basePath.serverBasePath,
      };

      authenticator = new Authenticator(mockOptions);
    });

    it('fails if request is not provided.', async () => {
      await expect(authenticator.authenticate(undefined as any)).rejects.toThrowError(
        'Request should be a valid "KibanaRequest" instance, was [undefined].'
      );
    });

    it('fails if an authentication provider fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const failureReason = new Error('Not Authorized');

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(failureReason)
      );

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('returns user that authentication provider returns.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Basic ***' },
      });

      const user = mockAuthenticatedUser();
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { authHeaders: { authorization: 'Basic .....' } })
      );

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Basic .....' });
    });

    it('creates session whenever authentication provider returns state for system API requests', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;

      mockOptions.isSystemAPIRequest.mockReturnValue(true);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      const systemAPIAuthenticationResult = await authenticator.authenticate(request);
      expect(systemAPIAuthenticationResult.succeeded()).toBe(true);
      expect(systemAPIAuthenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: { authorization },
      });
    });

    it('creates session whenever authentication provider returns state for non-system API requests', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;

      mockOptions.isSystemAPIRequest.mockReturnValue(false);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      const systemAPIAuthenticationResult = await authenticator.authenticate(request);
      expect(systemAPIAuthenticationResult.succeeded()).toBe(true);
      expect(systemAPIAuthenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: { authorization },
      });
    });

    it('does not extend session for system API calls.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(true);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('extends session for non-system API calls.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(false);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith(mockSessVal);
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('properly extends session expiration if it is defined.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();

      // Create new authenticator with non-null session `idleTimeout`.
      mockOptions = getMockOptions({
        session: {
          idleTimeout: duration(3600 * 24),
          lifespan: null,
        },
        authc: { providers: ['basic'], oidc: {}, saml: {} },
      });

      mockSessionStorage = sessionStorageMock.create();
      mockSessionStorage.get.mockResolvedValue(mockSessVal);
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

      authenticator = new Authenticator(mockOptions);

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );

      jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        idleTimeoutExpiration: currentDate + 3600 * 24,
      });
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('does not extend session lifespan expiration.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();
      const hr = 1000 * 60 * 60;

      // Create new authenticator with non-null session `idleTimeout` and `lifespan`.
      mockOptions = getMockOptions({
        session: {
          idleTimeout: duration(hr * 2),
          lifespan: duration(hr * 8),
        },
        authc: { providers: ['basic'], oidc: {}, saml: {} },
      });

      mockSessionStorage = sessionStorageMock.create();
      mockSessionStorage.get.mockResolvedValue({
        ...mockSessVal,
        // this session was created 6.5 hrs ago (and has 1.5 hrs left in its lifespan)
        // it was last extended 1 hour ago, which means it will expire in 1 hour
        idleTimeoutExpiration: currentDate + hr * 1,
        lifespanExpiration: currentDate + hr * 1.5,
      });
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

      authenticator = new Authenticator(mockOptions);

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );

      jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        idleTimeoutExpiration: currentDate + hr * 2,
        lifespanExpiration: currentDate + hr * 1.5,
      });
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    describe('conditionally updates the session lifespan expiration', () => {
      const hr = 1000 * 60 * 60;
      const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();

      async function createAndUpdateSession(
        lifespan: Duration | null,
        oldExpiration: number | null,
        newExpiration: number | null
      ) {
        const user = mockAuthenticatedUser();
        const request = httpServerMock.createKibanaRequest();
        jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

        mockOptions = getMockOptions({
          session: {
            idleTimeout: null,
            lifespan,
          },
          authc: { providers: ['basic'], oidc: {}, saml: {} },
        });

        mockSessionStorage = sessionStorageMock.create();
        mockSessionStorage.get.mockResolvedValue({
          ...mockSessVal,
          idleTimeoutExpiration: null,
          lifespanExpiration: oldExpiration,
        });
        mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

        authenticator = new Authenticator(mockOptions);

        mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
          AuthenticationResult.succeeded(user)
        );

        const authenticationResult = await authenticator.authenticate(request);
        expect(authenticationResult.succeeded()).toBe(true);
        expect(authenticationResult.user).toEqual(user);

        expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
        expect(mockSessionStorage.set).toHaveBeenCalledWith({
          ...mockSessVal,
          idleTimeoutExpiration: null,
          lifespanExpiration: newExpiration,
        });
        expect(mockSessionStorage.clear).not.toHaveBeenCalled();
      }

      it('does not change a non-null lifespan expiration when configured to non-null value.', async () => {
        await createAndUpdateSession(duration(hr * 8), 1234, 1234);
      });
      it('does not change a null lifespan expiration when configured to null value.', async () => {
        await createAndUpdateSession(null, null, null);
      });
      it('does change a non-null lifespan expiration when configured to null value.', async () => {
        await createAndUpdateSession(null, 1234, null);
      });
      it('does change a null lifespan expiration when configured to non-null value', async () => {
        await createAndUpdateSession(duration(hr * 8), null, currentDate + hr * 8);
      });
    });

    it('does not touch session for system API calls if authentication fails with non-401 reason.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(true);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(new Error('some error'))
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.failed()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('does not touch session for non-system API calls if authentication fails with non-401 reason.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(false);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(new Error('some error'))
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.failed()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('replaces existing session with the one returned by authentication provider for system API requests', async () => {
      const user = mockAuthenticatedUser();
      const newState = { authorization: 'Basic yyy' };
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(true);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: newState })
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: newState,
      });
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('replaces existing session with the one returned by authentication provider for non-system API requests', async () => {
      const user = mockAuthenticatedUser();
      const newState = { authorization: 'Basic yyy' };
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(false);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: newState })
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: newState,
      });
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('clears session if provider failed to authenticate system API request with 401 with active session.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(true);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(Boom.unauthorized())
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.failed()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session if provider failed to authenticate non-system API request with 401 with active session.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(false);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(Boom.unauthorized())
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.failed()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session if provider requested it via setting state to `null`.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.redirectTo('some-url', { state: null })
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.redirected()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('does not clear session if provider can not handle system API request authentication with active session.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(true);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.notHandled()
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.notHandled()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('does not clear session if provider can not handle non-system API request authentication with active session.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(false);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.notHandled()
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.notHandled()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('clears session for system API request if it belongs to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(true);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.notHandled()
      );
      mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, provider: 'token' });

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.notHandled()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session for non-system API request if it belongs to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.isSystemAPIRequest.mockReturnValue(false);
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.notHandled()
      );
      mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, provider: 'token' });

      const authenticationResult = await authenticator.authenticate(request);
      expect(authenticationResult.notHandled()).toBe(true);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });
  });

  describe('`logout` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    let mockSessVal: any;
    beforeEach(() => {
      mockOptions = getMockOptions({
        authc: { providers: ['basic'], oidc: {}, saml: {} },
      });
      mockSessionStorage = sessionStorageMock.create();
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      mockSessVal = {
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        state: { authorization: 'Basic xxx' },
        provider: 'basic',
        path: mockOptions.basePath.serverBasePath,
      };

      authenticator = new Authenticator(mockOptions);
    });

    it('fails if request is not provided.', async () => {
      await expect(authenticator.logout(undefined as any)).rejects.toThrowError(
        'Request should be a valid "KibanaRequest" instance, was [undefined].'
      );
    });

    it('returns `notHandled` if session does not exist.', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockSessionStorage.get.mockResolvedValue(null);

      const deauthenticationResult = await authenticator.logout(request);

      expect(deauthenticationResult.notHandled()).toBe(true);
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('clears session and returns whatever authentication provider returns.', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockBasicAuthenticationProvider.logout.mockResolvedValue(
        DeauthenticationResult.redirectTo('some-url')
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      const deauthenticationResult = await authenticator.logout(request);

      expect(mockBasicAuthenticationProvider.logout).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.clear).toHaveBeenCalled();
      expect(deauthenticationResult.redirected()).toBe(true);
      expect(deauthenticationResult.redirectURL).toBe('some-url');
    });

    it('if session does not exist but provider name is valid, returns whatever authentication provider returns.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { provider: 'basic' } });
      mockSessionStorage.get.mockResolvedValue(null);

      mockBasicAuthenticationProvider.logout.mockResolvedValue(
        DeauthenticationResult.redirectTo('some-url')
      );

      const deauthenticationResult = await authenticator.logout(request);

      expect(mockBasicAuthenticationProvider.logout).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
      expect(deauthenticationResult.redirected()).toBe(true);
      expect(deauthenticationResult.redirectURL).toBe('some-url');
    });

    it('returns `notHandled` if session does not exist and provider name is invalid', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { provider: 'foo' } });
      mockSessionStorage.get.mockResolvedValue(null);

      const deauthenticationResult = await authenticator.logout(request);

      expect(deauthenticationResult.notHandled()).toBe(true);
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('only clears session if it belongs to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = { authorization: 'Bearer xxx' };
      mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, state, provider: 'token' });

      const deauthenticationResult = await authenticator.logout(request);

      expect(mockBasicAuthenticationProvider.logout).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
      expect(deauthenticationResult.notHandled()).toBe(true);
    });
  });

  describe('`getSessionInfo` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    beforeEach(() => {
      mockOptions = getMockOptions({
        authc: { providers: ['basic'], oidc: {}, saml: {} },
      });
      mockSessionStorage = sessionStorageMock.create();
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

      authenticator = new Authenticator(mockOptions);
    });

    it('returns current session info if session exists.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = { authorization: 'Basic xxx' };
      const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();
      const mockInfo = {
        now: currentDate,
        idleTimeoutExpiration: currentDate + 60000,
        lifespanExpiration: currentDate + 120000,
        provider: 'basic',
      };
      mockSessionStorage.get.mockResolvedValue({
        idleTimeoutExpiration: mockInfo.idleTimeoutExpiration,
        lifespanExpiration: mockInfo.lifespanExpiration,
        state,
        provider: mockInfo.provider,
        path: mockOptions.basePath.serverBasePath,
      });
      jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

      const sessionInfo = await authenticator.getSessionInfo(request);

      expect(sessionInfo).toEqual(mockInfo);
    });

    it('returns `null` if session does not exist.', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockSessionStorage.get.mockResolvedValue(null);

      const sessionInfo = await authenticator.getSessionInfo(request);

      expect(sessionInfo).toBe(null);
    });
  });
});
