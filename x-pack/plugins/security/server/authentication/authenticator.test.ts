/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./providers/basic');
jest.mock('./providers/token');
jest.mock('./providers/saml');
jest.mock('./providers/http');

import Boom from 'boom';
import { duration, Duration } from 'moment';
import { SessionStorage } from '../../../../../src/core/server';

import {
  loggingSystemMock,
  httpServiceMock,
  httpServerMock,
  elasticsearchServiceMock,
  sessionStorageMock,
} from '../../../../../src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { securityAuditLoggerMock } from '../audit/index.mock';
import { SecurityLicenseFeatures } from '../../common/licensing';
import { ConfigSchema, createConfig } from '../config';
import { AuthenticationResult } from './authentication_result';
import { Authenticator, AuthenticatorOptions, ProviderSession } from './authenticator';
import { DeauthenticationResult } from './deauthentication_result';
import { BasicAuthenticationProvider, SAMLAuthenticationProvider } from './providers';
import { securityFeatureUsageServiceMock } from '../feature_usage/index.mock';

function getMockOptions({
  session,
  providers,
  http = {},
  selector,
}: {
  session?: AuthenticatorOptions['config']['session'];
  providers?: Record<string, unknown> | string[];
  http?: Partial<AuthenticatorOptions['config']['authc']['http']>;
  selector?: AuthenticatorOptions['config']['authc']['selector'];
} = {}) {
  return {
    auditLogger: securityAuditLoggerMock.create(),
    getCurrentUser: jest.fn(),
    clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
    basePath: httpServiceMock.createSetupContract().basePath,
    license: licenseMock.create(),
    loggers: loggingSystemMock.create(),
    config: createConfig(
      ConfigSchema.validate({ session, authc: { selector, providers, http } }),
      loggingSystemMock.create().get(),
      { isTLSEnabled: false }
    ),
    sessionStorageFactory: sessionStorageMock.createFactory<ProviderSession>(),
    getFeatureUsageService: jest
      .fn()
      .mockReturnValue(securityFeatureUsageServiceMock.createStartContract()),
  };
}

describe('Authenticator', () => {
  let mockBasicAuthenticationProvider: jest.Mocked<PublicMethodsOf<BasicAuthenticationProvider>>;
  beforeEach(() => {
    mockBasicAuthenticationProvider = {
      login: jest.fn(),
      authenticate: jest.fn().mockResolvedValue(AuthenticationResult.notHandled()),
      logout: jest.fn().mockResolvedValue(DeauthenticationResult.notHandled()),
      getHTTPAuthenticationScheme: jest.fn(),
    };

    jest.requireMock('./providers/http').HTTPAuthenticationProvider.mockImplementation(() => ({
      type: 'http',
      authenticate: jest.fn().mockResolvedValue(AuthenticationResult.notHandled()),
      logout: jest.fn().mockResolvedValue(DeauthenticationResult.notHandled()),
    }));

    jest.requireMock('./providers/basic').BasicAuthenticationProvider.mockImplementation(() => ({
      type: 'basic',
      ...mockBasicAuthenticationProvider,
    }));

    jest.requireMock('./providers/saml').SAMLAuthenticationProvider.mockImplementation(() => ({
      type: 'saml',
      getHTTPAuthenticationScheme: jest.fn(),
    }));
  });

  afterEach(() => jest.clearAllMocks());

  describe('initialization', () => {
    it('fails if authentication providers are not configured.', () => {
      expect(
        () => new Authenticator(getMockOptions({ providers: {}, http: { enabled: false } }))
      ).toThrowError(
        'No authentication provider is configured. Verify `xpack.security.authc.*` config value.'
      );
    });

    it('fails if configured authentication provider is not known.', () => {
      expect(() => new Authenticator(getMockOptions({ providers: ['super-basic'] }))).toThrowError(
        'Unsupported authentication provider name: super-basic.'
      );
    });

    it('fails if any of the user specified provider uses reserved __http__ name.', () => {
      expect(
        () =>
          new Authenticator(getMockOptions({ providers: { basic: { __http__: { order: 0 } } } }))
      ).toThrowError('Provider name "__http__" is reserved.');
    });

    it('properly sets `loggedOut` URL.', () => {
      const basicAuthenticationProviderMock = jest.requireMock('./providers/basic')
        .BasicAuthenticationProvider;

      basicAuthenticationProviderMock.mockClear();
      new Authenticator(getMockOptions());
      expect(basicAuthenticationProviderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          urls: {
            loggedOut: '/mock-server-basepath/security/logged_out',
          },
        }),
        expect.anything()
      );

      basicAuthenticationProviderMock.mockClear();
      new Authenticator(getMockOptions({ selector: { enabled: true } }));
      expect(basicAuthenticationProviderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          urls: {
            loggedOut: `/mock-server-basepath/login?msg=LOGGED_OUT`,
          },
        }),
        expect.anything()
      );
    });

    describe('HTTP authentication provider', () => {
      beforeEach(() => {
        jest
          .requireMock('./providers/basic')
          .BasicAuthenticationProvider.mockImplementation(() => ({
            type: 'basic',
            getHTTPAuthenticationScheme: jest.fn().mockReturnValue('basic'),
          }));
      });

      afterEach(() => jest.resetAllMocks());

      it('enabled by default', () => {
        const authenticator = new Authenticator(getMockOptions());
        expect(authenticator.isProviderTypeEnabled('basic')).toBe(true);
        expect(authenticator.isProviderTypeEnabled('http')).toBe(true);

        expect(
          jest.requireMock('./providers/http').HTTPAuthenticationProvider
        ).toHaveBeenCalledWith(expect.anything(), {
          supportedSchemes: new Set(['apikey', 'basic']),
        });
      });

      it('includes all required schemes if `autoSchemesEnabled` is enabled', () => {
        const authenticator = new Authenticator(
          getMockOptions({
            providers: { basic: { basic1: { order: 0 } }, kerberos: { kerberos1: { order: 1 } } },
          })
        );
        expect(authenticator.isProviderTypeEnabled('basic')).toBe(true);
        expect(authenticator.isProviderTypeEnabled('kerberos')).toBe(true);
        expect(authenticator.isProviderTypeEnabled('http')).toBe(true);

        expect(
          jest.requireMock('./providers/http').HTTPAuthenticationProvider
        ).toHaveBeenCalledWith(expect.anything(), {
          supportedSchemes: new Set(['apikey', 'basic', 'bearer']),
        });
      });

      it('does not include additional schemes if `autoSchemesEnabled` is disabled', () => {
        const authenticator = new Authenticator(
          getMockOptions({
            providers: { basic: { basic1: { order: 0 } }, kerberos: { kerberos1: { order: 1 } } },
            http: { autoSchemesEnabled: false },
          })
        );
        expect(authenticator.isProviderTypeEnabled('basic')).toBe(true);
        expect(authenticator.isProviderTypeEnabled('kerberos')).toBe(true);
        expect(authenticator.isProviderTypeEnabled('http')).toBe(true);

        expect(
          jest.requireMock('./providers/http').HTTPAuthenticationProvider
        ).toHaveBeenCalledWith(expect.anything(), { supportedSchemes: new Set(['apikey']) });
      });

      it('disabled if explicitly disabled', () => {
        const authenticator = new Authenticator(
          getMockOptions({
            providers: { basic: { basic1: { order: 0 } } },
            http: { enabled: false },
          })
        );
        expect(authenticator.isProviderTypeEnabled('basic')).toBe(true);
        expect(authenticator.isProviderTypeEnabled('http')).toBe(false);

        expect(
          jest.requireMock('./providers/http').HTTPAuthenticationProvider
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('`login` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    let mockSessVal: any;
    beforeEach(() => {
      mockOptions = getMockOptions({ providers: { basic: { basic1: { order: 0 } } } });
      mockSessionStorage = sessionStorageMock.create();
      mockSessionStorage.get.mockResolvedValue(null);
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      mockSessVal = {
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        state: { authorization: 'Basic xxx' },
        provider: { type: 'basic', name: 'basic1' },
        path: mockOptions.basePath.serverBasePath,
      };

      authenticator = new Authenticator(mockOptions);
    });

    it('fails if request is not provided.', async () => {
      await expect(authenticator.login(undefined as any, undefined as any)).rejects.toThrowError(
        'Request should be a valid "KibanaRequest" instance, was [undefined].'
      );
    });

    it('fails if login attempt is not provided or invalid.', async () => {
      await expect(
        authenticator.login(httpServerMock.createKibanaRequest(), undefined as any)
      ).rejects.toThrowError(
        'Login attempt should be an object with non-empty "provider.type" or "provider.name" property.'
      );

      await expect(
        authenticator.login(httpServerMock.createKibanaRequest(), {} as any)
      ).rejects.toThrowError(
        'Login attempt should be an object with non-empty "provider.type" or "provider.name" property.'
      );

      await expect(
        authenticator.login(httpServerMock.createKibanaRequest(), {
          provider: 'basic',
          value: {},
        } as any)
      ).rejects.toThrowError(
        'Login attempt should be an object with non-empty "provider.type" or "provider.name" property.'
      );
    });

    it('fails if an authentication provider fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const failureReason = new Error('Not Authorized');

      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.failed(failureReason)
      );

      await expect(
        authenticator.login(request, { provider: { type: 'basic' }, value: {} })
      ).resolves.toEqual(AuthenticationResult.failed(failureReason));
    });

    it('returns user that authentication provider returns.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const user = mockAuthenticatedUser();
      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.succeeded(user, { authHeaders: { authorization: 'Basic .....' } })
      );

      await expect(
        authenticator.login(request, { provider: { type: 'basic' }, value: {} })
      ).resolves.toEqual(
        AuthenticationResult.succeeded(user, { authHeaders: { authorization: 'Basic .....' } })
      );
    });

    it('creates session whenever authentication provider returns state', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;

      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      await expect(
        authenticator.login(request, { provider: { type: 'basic' }, value: {} })
      ).resolves.toEqual(AuthenticationResult.succeeded(user, { state: { authorization } }));

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: { authorization },
      });
    });

    it('returns `notHandled` if login attempt is targeted to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest();
      await expect(
        authenticator.login(request, { provider: { type: 'token' }, value: {} })
      ).resolves.toEqual(AuthenticationResult.notHandled());

      await expect(
        authenticator.login(request, { provider: { name: 'basic2' }, value: {} })
      ).resolves.toEqual(AuthenticationResult.notHandled());
    });

    describe('multi-provider scenarios', () => {
      let mockSAMLAuthenticationProvider1: jest.Mocked<PublicMethodsOf<SAMLAuthenticationProvider>>;
      let mockSAMLAuthenticationProvider2: jest.Mocked<PublicMethodsOf<SAMLAuthenticationProvider>>;

      beforeEach(() => {
        mockSAMLAuthenticationProvider1 = {
          login: jest.fn().mockResolvedValue(AuthenticationResult.notHandled()),
          authenticate: jest.fn(),
          logout: jest.fn(),
          getHTTPAuthenticationScheme: jest.fn(),
        };

        mockSAMLAuthenticationProvider2 = {
          login: jest.fn().mockResolvedValue(AuthenticationResult.notHandled()),
          authenticate: jest.fn(),
          logout: jest.fn(),
          getHTTPAuthenticationScheme: jest.fn(),
        };

        jest
          .requireMock('./providers/saml')
          .SAMLAuthenticationProvider.mockImplementationOnce(() => ({
            type: 'saml',
            ...mockSAMLAuthenticationProvider1,
          }))
          .mockImplementationOnce(() => ({
            type: 'saml',
            ...mockSAMLAuthenticationProvider2,
          }));

        mockOptions = getMockOptions({
          providers: {
            basic: { basic1: { order: 0 } },
            saml: {
              saml1: { realm: 'saml1-realm', order: 1 },
              saml2: { realm: 'saml2-realm', order: 2 },
            },
          },
        });
        mockSessionStorage = sessionStorageMock.create();
        mockSessionStorage.get.mockResolvedValue(null);
        mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

        authenticator = new Authenticator(mockOptions);
      });

      it('tries to login only with the provider that has specified name', async () => {
        const user = mockAuthenticatedUser();
        const request = httpServerMock.createKibanaRequest();

        mockSAMLAuthenticationProvider2.login.mockResolvedValue(
          AuthenticationResult.succeeded(user, { state: { token: 'access-token' } })
        );

        await expect(
          authenticator.login(request, { provider: { name: 'saml2' }, value: {} })
        ).resolves.toEqual(
          AuthenticationResult.succeeded(user, { state: { token: 'access-token' } })
        );

        expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
        expect(mockSessionStorage.set).toHaveBeenCalledWith({
          ...mockSessVal,
          provider: { type: 'saml', name: 'saml2' },
          state: { token: 'access-token' },
        });

        expect(mockBasicAuthenticationProvider.login).not.toHaveBeenCalled();
        expect(mockSAMLAuthenticationProvider1.login).not.toHaveBeenCalled();
      });

      it('tries to login only with the provider that has specified type', async () => {
        const request = httpServerMock.createKibanaRequest();

        await expect(
          authenticator.login(request, { provider: { type: 'saml' }, value: {} })
        ).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockSessionStorage.set).not.toHaveBeenCalled();

        expect(mockBasicAuthenticationProvider.login).not.toHaveBeenCalled();
        expect(mockSAMLAuthenticationProvider1.login).toHaveBeenCalledTimes(1);
        expect(mockSAMLAuthenticationProvider2.login).toHaveBeenCalledTimes(1);
        expect(mockSAMLAuthenticationProvider1.login.mock.invocationCallOrder[0]).toBeLessThan(
          mockSAMLAuthenticationProvider2.login.mock.invocationCallOrder[0]
        );
      });

      it('returns as soon as provider handles request', async () => {
        const request = httpServerMock.createKibanaRequest();

        const authenticationResults = [
          AuthenticationResult.failed(new Error('Fail')),
          AuthenticationResult.succeeded(mockAuthenticatedUser(), { state: { result: '200' } }),
          AuthenticationResult.redirectTo('/some/url', { state: { result: '302' } }),
        ];

        for (const result of authenticationResults) {
          mockSAMLAuthenticationProvider1.login.mockResolvedValue(result);

          await expect(
            authenticator.login(request, { provider: { type: 'saml' }, value: {} })
          ).resolves.toEqual(result);
        }

        expect(mockSessionStorage.set).toHaveBeenCalledTimes(2);
        expect(mockSessionStorage.set).toHaveBeenCalledWith({
          ...mockSessVal,
          provider: { type: 'saml', name: 'saml1' },
          state: { result: '200' },
        });
        expect(mockSessionStorage.set).toHaveBeenCalledWith({
          ...mockSessVal,
          provider: { type: 'saml', name: 'saml1' },
          state: { result: '302' },
        });

        expect(mockBasicAuthenticationProvider.login).not.toHaveBeenCalled();
        expect(mockSAMLAuthenticationProvider2.login).not.toHaveBeenCalled();
        expect(mockSAMLAuthenticationProvider1.login).toHaveBeenCalledTimes(3);
      });

      it('provides session only if provider name matches', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockSessionStorage.get.mockResolvedValue({
          ...mockSessVal,
          provider: { type: 'saml', name: 'saml2' },
        });

        const loginAttemptValue = Symbol('attempt');
        await expect(
          authenticator.login(request, { provider: { type: 'saml' }, value: loginAttemptValue })
        ).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockBasicAuthenticationProvider.login).not.toHaveBeenCalled();

        expect(mockSAMLAuthenticationProvider1.login).toHaveBeenCalledTimes(1);
        expect(mockSAMLAuthenticationProvider1.login).toHaveBeenCalledWith(
          request,
          loginAttemptValue,
          null
        );

        expect(mockSAMLAuthenticationProvider2.login).toHaveBeenCalledTimes(1);
        expect(mockSAMLAuthenticationProvider2.login).toHaveBeenCalledWith(
          request,
          loginAttemptValue,
          mockSessVal.state
        );

        // Presence of the session has precedence over order.
        expect(mockSAMLAuthenticationProvider2.login.mock.invocationCallOrder[0]).toBeLessThan(
          mockSAMLAuthenticationProvider1.login.mock.invocationCallOrder[0]
        );
      });
    });

    it('clears session if it belongs to a different provider.', async () => {
      const user = mockAuthenticatedUser();
      const credentials = { username: 'user', password: 'password' };
      const request = httpServerMock.createKibanaRequest();

      mockBasicAuthenticationProvider.login.mockResolvedValue(AuthenticationResult.succeeded(user));
      mockSessionStorage.get.mockResolvedValue({
        ...mockSessVal,
        provider: { type: 'token', name: 'token1' },
      });

      await expect(
        authenticator.login(request, { provider: { type: 'basic' }, value: credentials })
      ).resolves.toEqual(AuthenticationResult.succeeded(user));

      expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(
        request,
        credentials,
        null
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session if it belongs to a provider with the name that is registered but has different type.', async () => {
      const user = mockAuthenticatedUser();
      const credentials = { username: 'user', password: 'password' };
      const request = httpServerMock.createKibanaRequest();

      // Re-configure authenticator with `token` provider that uses the name of `basic`.
      const loginMock = jest.fn().mockResolvedValue(AuthenticationResult.succeeded(user));
      jest.requireMock('./providers/token').TokenAuthenticationProvider.mockImplementation(() => ({
        type: 'token',
        login: loginMock,
        getHTTPAuthenticationScheme: jest.fn(),
      }));
      mockOptions = getMockOptions({ providers: { token: { basic1: { order: 0 } } } });
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      authenticator = new Authenticator(mockOptions);

      mockBasicAuthenticationProvider.login.mockResolvedValue(AuthenticationResult.succeeded(user));
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(
        authenticator.login(request, { provider: { name: 'basic1' }, value: credentials })
      ).resolves.toEqual(AuthenticationResult.succeeded(user));

      expect(loginMock).toHaveBeenCalledWith(request, credentials, null);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session if provider asked to do so.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      mockBasicAuthenticationProvider.login.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: null })
      );

      await expect(
        authenticator.login(request, { provider: { type: 'basic' }, value: {} })
      ).resolves.toEqual(AuthenticationResult.succeeded(user, { state: null }));

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears legacy session.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();

      // Use string format for the `provider` session value field to emulate legacy session.
      mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, provider: 'basic' });

      mockBasicAuthenticationProvider.login.mockResolvedValue(AuthenticationResult.succeeded(user));

      await expect(
        authenticator.login(request, { provider: { type: 'basic' }, value: {} })
      ).resolves.toEqual(AuthenticationResult.succeeded(user));

      expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledTimes(1);
      expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(request, {}, null);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });
  });

  describe('`authenticate` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    let mockSessVal: any;
    beforeEach(() => {
      mockOptions = getMockOptions({ providers: { basic: { basic1: { order: 0 } } } });
      mockSessionStorage = sessionStorageMock.create<ProviderSession>();
      mockSessionStorage.get.mockResolvedValue(null);
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      mockSessVal = {
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        state: { authorization: 'Basic xxx' },
        provider: { type: 'basic', name: 'basic1' },
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

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user, { authHeaders: { authorization: 'Basic .....' } })
      );
    });

    it('creates session whenever authentication provider returns state for system API requests', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'true' },
      });
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: { authorization },
      });
    });

    it('creates session whenever authentication provider returns state for non-system API requests', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'false' },
      });
      const authorization = `Basic ${Buffer.from('foo:bar').toString('base64')}`;

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user, { state: { authorization } })
      );

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: { authorization },
      });
    });

    it('does not extend session for system API calls.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'true' },
      });

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user)
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('extends session for non-system API calls.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'false' },
      });

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user)
      );

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
        providers: { basic: { basic1: { order: 0 } } },
      });

      mockSessionStorage = sessionStorageMock.create();
      mockSessionStorage.get.mockResolvedValue(mockSessVal);
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

      authenticator = new Authenticator(mockOptions);

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );

      jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user)
      );

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
        providers: { basic: { basic1: { order: 0 } } },
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

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user)
      );

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
          providers: { basic: { basic1: { order: 0 } } },
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

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded(user)
        );

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
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'true' },
      });

      const failureReason = new Error('some error');
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(failureReason)
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('does not touch session for non-system API calls if authentication fails with non-401 reason.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'false' },
      });

      const failureReason = new Error('some error');
      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(failureReason)
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('replaces existing session with the one returned by authentication provider for system API requests', async () => {
      const user = mockAuthenticatedUser();
      const newState = { authorization: 'Basic yyy' };
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'true' },
      });

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: newState })
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user, { state: newState })
      );

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
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'false' },
      });

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user, { state: newState })
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user, { state: newState })
      );

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessVal,
        state: newState,
      });
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('clears session if provider failed to authenticate system API request with 401 with active session.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'true' },
      });

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(Boom.unauthorized())
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized())
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session if provider failed to authenticate non-system API request with 401 with active session.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'false' },
      });

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.failed(Boom.unauthorized())
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized())
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session if provider requested it via setting state to `null`.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.redirectTo('some-url', { state: null })
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.redirectTo('some-url', { state: null })
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears legacy session.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest();

      // Use string format for the `provider` session value field to emulate legacy session.
      mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, provider: 'basic' });

      mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(user)
      );

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.succeeded(user)
      );

      expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalledTimes(1);
      expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalledWith(request, null);

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('does not clear session if provider can not handle system API request authentication with active session.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'true' },
      });

      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('does not clear session if provider can not handle non-system API request authentication with active session.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'false' },
      });

      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('clears session for system API request if it belongs to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'true' },
      });

      mockSessionStorage.get.mockResolvedValue({
        ...mockSessVal,
        provider: { type: 'token', name: 'token1' },
      });

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('clears session for non-system API request if it belongs to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-system-request': 'false' },
      });

      mockSessionStorage.get.mockResolvedValue({
        ...mockSessVal,
        provider: { type: 'token', name: 'token1' },
      });

      await expect(authenticator.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    describe('with Login Selector', () => {
      beforeEach(() => {
        mockOptions = getMockOptions({
          selector: { enabled: true },
          providers: { basic: { basic1: { order: 0 } } },
        });
        mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

        authenticator = new Authenticator(mockOptions);
      });

      it('does not redirect to Login Selector if there is an active session', async () => {
        const request = httpServerMock.createKibanaRequest();
        mockSessionStorage.get.mockResolvedValue(mockSessVal);

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.notHandled()
        );
        expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalled();
      });

      it('does not redirect AJAX requests to Login Selector', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.notHandled()
        );
        expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalled();
      });

      it('does not redirect to Login Selector if request has `Authorization` header', async () => {
        const request = httpServerMock.createKibanaRequest({
          headers: { authorization: 'Basic ***' },
        });

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.notHandled()
        );
        expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalled();
      });

      it('does not redirect to Login Selector if it is not enabled', async () => {
        mockOptions = getMockOptions({ providers: { basic: { basic1: { order: 0 } } } });
        mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
        authenticator = new Authenticator(mockOptions);

        const request = httpServerMock.createKibanaRequest();
        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.notHandled()
        );
        expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalled();
      });

      it('redirects to the Login Selector when needed.', async () => {
        const request = httpServerMock.createKibanaRequest();
        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.redirectTo(
            '/mock-server-basepath/login?next=%2Fmock-server-basepath%2Fpath'
          )
        );
        expect(mockBasicAuthenticationProvider.authenticate).not.toHaveBeenCalled();
      });
    });

    describe('with Access Agreement', () => {
      const mockUser = mockAuthenticatedUser();
      beforeEach(() => {
        mockOptions = getMockOptions({
          providers: {
            basic: { basic1: { order: 0, accessAgreement: { message: 'some notice' } } },
          },
        });
        mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
        mockOptions.license.getFeatures.mockReturnValue({
          allowAccessAgreement: true,
        } as SecurityLicenseFeatures);

        mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
          AuthenticationResult.succeeded(mockUser)
        );

        authenticator = new Authenticator(mockOptions);
      });

      it('does not redirect to Access Agreement if there is no active session', async () => {
        const request = httpServerMock.createKibanaRequest();
        mockSessionStorage.get.mockResolvedValue(null);

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser)
        );
      });

      it('does not redirect AJAX requests to Access Agreement', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
        mockSessionStorage.get.mockResolvedValue(mockSessVal);

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser)
        );
      });

      it('does not redirect to Access Agreement if request cannot be handled', async () => {
        const request = httpServerMock.createKibanaRequest();
        mockSessionStorage.get.mockResolvedValue(mockSessVal);

        mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
          AuthenticationResult.notHandled()
        );

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.notHandled()
        );
      });

      it('does not redirect to Access Agreement if authentication fails', async () => {
        const request = httpServerMock.createKibanaRequest();
        mockSessionStorage.get.mockResolvedValue(mockSessVal);

        const failureReason = new Error('something went wrong');
        mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
          AuthenticationResult.failed(failureReason)
        );

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.failed(failureReason)
        );
      });

      it('does not redirect to Access Agreement if redirect is required to complete authentication', async () => {
        const request = httpServerMock.createKibanaRequest();
        mockSessionStorage.get.mockResolvedValue(mockSessVal);

        mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
          AuthenticationResult.redirectTo('/some-url')
        );

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.redirectTo('/some-url')
        );
      });

      it('does not redirect to Access Agreement if user has already acknowledged it', async () => {
        const request = httpServerMock.createKibanaRequest();
        mockSessionStorage.get.mockResolvedValue({
          ...mockSessVal,
          accessAgreementAcknowledged: true,
        });

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser)
        );
      });

      it('does not redirect to Access Agreement its own requests', async () => {
        const request = httpServerMock.createKibanaRequest({ path: '/security/access_agreement' });
        mockSessionStorage.get.mockResolvedValue(mockSessVal);

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser)
        );
      });

      it('does not redirect to Access Agreement if it is not configured', async () => {
        mockOptions = getMockOptions({ providers: { basic: { basic1: { order: 0 } } } });
        mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
        mockSessionStorage.get.mockResolvedValue(mockSessVal);
        authenticator = new Authenticator(mockOptions);

        const request = httpServerMock.createKibanaRequest();
        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser)
        );
      });

      it('does not redirect to Access Agreement if license doesnt allow it.', async () => {
        const request = httpServerMock.createKibanaRequest();
        mockSessionStorage.get.mockResolvedValue(mockSessVal);
        mockOptions.license.getFeatures.mockReturnValue({
          allowAccessAgreement: false,
        } as SecurityLicenseFeatures);

        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser)
        );
      });

      it('redirects to Access Agreement when needed.', async () => {
        mockSessionStorage.get.mockResolvedValue(mockSessVal);

        const request = httpServerMock.createKibanaRequest();
        await expect(authenticator.authenticate(request)).resolves.toEqual(
          AuthenticationResult.redirectTo(
            '/mock-server-basepath/security/access_agreement?next=%2Fmock-server-basepath%2Fpath'
          )
        );
      });
    });
  });

  describe('`logout` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    let mockSessVal: any;
    beforeEach(() => {
      mockOptions = getMockOptions({ providers: { basic: { basic1: { order: 0 } } } });
      mockSessionStorage = sessionStorageMock.create();
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      mockSessVal = {
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        state: { authorization: 'Basic xxx' },
        provider: { type: 'basic', name: 'basic1' },
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
      mockBasicAuthenticationProvider.logout.mockResolvedValue(DeauthenticationResult.notHandled());

      await expect(authenticator.logout(request)).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );

      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('clears session and returns whatever authentication provider returns.', async () => {
      const request = httpServerMock.createKibanaRequest();
      mockBasicAuthenticationProvider.logout.mockResolvedValue(
        DeauthenticationResult.redirectTo('some-url')
      );
      mockSessionStorage.get.mockResolvedValue(mockSessVal);

      await expect(authenticator.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo('some-url')
      );

      expect(mockBasicAuthenticationProvider.logout).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('if session does not exist but provider name is valid, returns whatever authentication provider returns.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { provider: 'basic1' } });
      mockSessionStorage.get.mockResolvedValue(null);

      mockBasicAuthenticationProvider.logout.mockResolvedValue(
        DeauthenticationResult.redirectTo('some-url')
      );

      await expect(authenticator.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo('some-url')
      );

      expect(mockBasicAuthenticationProvider.logout).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('returns `notHandled` if session does not exist and provider name is invalid', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { provider: 'foo' } });
      mockSessionStorage.get.mockResolvedValue(null);

      await expect(authenticator.logout(request)).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );

      expect(mockSessionStorage.clear).not.toHaveBeenCalled();
    });

    it('clears session if it belongs to not configured provider.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = { authorization: 'Bearer xxx' };
      mockSessionStorage.get.mockResolvedValue({
        ...mockSessVal,
        state,
        provider: { type: 'token', name: 'token1' },
      });

      await expect(authenticator.logout(request)).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );

      expect(mockBasicAuthenticationProvider.logout).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });
  });

  describe('`getSessionInfo` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    beforeEach(() => {
      mockOptions = getMockOptions({ providers: { basic: { basic1: { order: 0 } } } });
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
        provider: { type: 'basic' as 'basic', name: 'basic1' },
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

  describe('`isProviderEnabled` method', () => {
    it('returns `true` only if specified provider is enabled', () => {
      let authenticator = new Authenticator(
        getMockOptions({ providers: { basic: { basic1: { order: 0 } } } })
      );
      expect(authenticator.isProviderTypeEnabled('basic')).toBe(true);
      expect(authenticator.isProviderTypeEnabled('saml')).toBe(false);

      authenticator = new Authenticator(
        getMockOptions({
          providers: {
            basic: { basic1: { order: 0 } },
            saml: { saml1: { order: 1, realm: 'test' } },
          },
        })
      );
      expect(authenticator.isProviderTypeEnabled('basic')).toBe(true);
      expect(authenticator.isProviderTypeEnabled('saml')).toBe(true);
    });
  });

  describe('`acknowledgeAccessAgreement` method', () => {
    let authenticator: Authenticator;
    let mockOptions: ReturnType<typeof getMockOptions>;
    let mockSessionStorage: jest.Mocked<SessionStorage<ProviderSession>>;
    let mockSessionValue: any;
    beforeEach(() => {
      mockOptions = getMockOptions({ providers: { basic: { basic1: { order: 0 } } } });
      mockSessionStorage = sessionStorageMock.create();
      mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);
      mockSessionValue = {
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        state: { authorization: 'Basic xxx' },
        provider: { type: 'basic', name: 'basic1' },
        path: mockOptions.basePath.serverBasePath,
      };
      mockSessionStorage.get.mockResolvedValue(mockSessionValue);
      mockOptions.getCurrentUser.mockReturnValue(mockAuthenticatedUser());
      mockOptions.license.getFeatures.mockReturnValue({
        allowAccessAgreement: true,
      } as SecurityLicenseFeatures);

      authenticator = new Authenticator(mockOptions);
    });

    it('fails if user is not authenticated', async () => {
      mockOptions.getCurrentUser.mockReturnValue(null);

      await expect(
        authenticator.acknowledgeAccessAgreement(httpServerMock.createKibanaRequest())
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot acknowledge access agreement for unauthenticated user."`
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(
        mockOptions.getFeatureUsageService().recordPreAccessAgreementUsage
      ).not.toHaveBeenCalled();
    });

    it('fails if cannot retrieve user session', async () => {
      mockSessionStorage.get.mockResolvedValue(null);

      await expect(
        authenticator.acknowledgeAccessAgreement(httpServerMock.createKibanaRequest())
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot acknowledge access agreement for unauthenticated user."`
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(
        mockOptions.getFeatureUsageService().recordPreAccessAgreementUsage
      ).not.toHaveBeenCalled();
    });

    it('fails if license doesn allow access agreement acknowledgement', async () => {
      mockOptions.license.getFeatures.mockReturnValue({
        allowAccessAgreement: false,
      } as SecurityLicenseFeatures);

      await expect(
        authenticator.acknowledgeAccessAgreement(httpServerMock.createKibanaRequest())
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Current license does not allow access agreement acknowledgement."`
      );

      expect(mockSessionStorage.set).not.toHaveBeenCalled();
      expect(
        mockOptions.getFeatureUsageService().recordPreAccessAgreementUsage
      ).not.toHaveBeenCalled();
    });

    it('properly acknowledges access agreement for the authenticated user', async () => {
      await authenticator.acknowledgeAccessAgreement(httpServerMock.createKibanaRequest());

      expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.set).toHaveBeenCalledWith({
        ...mockSessionValue,
        accessAgreementAcknowledged: true,
      });

      expect(mockOptions.auditLogger.accessAgreementAcknowledged).toHaveBeenCalledTimes(1);
      expect(mockOptions.auditLogger.accessAgreementAcknowledged).toHaveBeenCalledWith('user', {
        type: 'basic',
        name: 'basic1',
      });

      expect(
        mockOptions.getFeatureUsageService().recordPreAccessAgreementUsage
      ).toHaveBeenCalledTimes(1);
    });
  });
});
