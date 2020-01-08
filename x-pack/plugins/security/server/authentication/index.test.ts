/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licenseMock } from '../../common/licensing/index.mock';

jest.mock('./api_keys');
jest.mock('./authenticator');

import Boom from 'boom';
import { errors } from 'elasticsearch';
import { first } from 'rxjs/operators';

import {
  loggingServiceMock,
  coreMock,
  httpServerMock,
  httpServiceMock,
  elasticsearchServiceMock,
} from '../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';

import {
  AuthenticationHandler,
  AuthToolkit,
  IClusterClient,
  CoreSetup,
  ElasticsearchErrorHelpers,
  KibanaRequest,
  LoggerFactory,
  ScopedClusterClient,
} from '../../../../../src/core/server';
import { AuthenticatedUser } from '../../common/model';
import { ConfigType, createConfig$ } from '../config';
import { LegacyAPI } from '../plugin';
import { AuthenticationResult } from './authentication_result';
import { setupAuthentication } from '.';
import {
  CreateAPIKeyResult,
  CreateAPIKeyParams,
  InvalidateAPIKeyResult,
  InvalidateAPIKeyParams,
} from './api_keys';
import { SecurityLicense } from '../../common/licensing';

describe('setupAuthentication()', () => {
  let mockSetupAuthenticationParams: {
    config: ConfigType;
    loggers: LoggerFactory;
    getLegacyAPI(): Pick<LegacyAPI, 'isSystemAPIRequest'>;
    http: jest.Mocked<CoreSetup['http']>;
    clusterClient: jest.Mocked<IClusterClient>;
    license: jest.Mocked<SecurityLicense>;
  };
  let mockScopedClusterClient: jest.Mocked<PublicMethodsOf<ScopedClusterClient>>;
  beforeEach(async () => {
    const mockConfig$ = createConfig$(
      coreMock.createPluginInitializerContext({
        encryptionKey: 'ab'.repeat(16),
        secureCookies: true,
        session: {
          idleTimeout: null,
          lifespan: null,
        },
        cookieName: 'my-sid-cookie',
        authc: { providers: ['basic'] },
      }),
      true
    );
    mockSetupAuthenticationParams = {
      http: coreMock.createSetup().http,
      config: await mockConfig$.pipe(first()).toPromise(),
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      license: licenseMock.create(),
      loggers: loggingServiceMock.create(),
      getLegacyAPI: jest.fn(),
    };

    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSetupAuthenticationParams.clusterClient.asScoped.mockReturnValue(
      (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('properly initializes session storage and registers auth handler', async () => {
    const config = {
      encryptionKey: 'ab'.repeat(16),
      secureCookies: true,
      cookieName: 'my-sid-cookie',
    };

    await setupAuthentication(mockSetupAuthenticationParams);

    expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledTimes(1);
    expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledWith(
      expect.any(Function)
    );

    expect(
      mockSetupAuthenticationParams.http.createCookieSessionStorageFactory
    ).toHaveBeenCalledTimes(1);
    expect(
      mockSetupAuthenticationParams.http.createCookieSessionStorageFactory
    ).toHaveBeenCalledWith({
      encryptionKey: config.encryptionKey,
      isSecure: config.secureCookies,
      name: config.cookieName,
      validate: expect.any(Function),
    });
  });

  describe('authentication handler', () => {
    let authHandler: AuthenticationHandler;
    let authenticate: jest.SpyInstance<Promise<AuthenticationResult>, [KibanaRequest]>;
    let mockAuthToolkit: jest.Mocked<AuthToolkit>;
    beforeEach(async () => {
      mockAuthToolkit = httpServiceMock.createAuthToolkit();

      await setupAuthentication(mockSetupAuthenticationParams);

      authHandler = mockSetupAuthenticationParams.http.registerAuth.mock.calls[0][0];
      authenticate = jest.requireMock('./authenticator').Authenticator.mock.instances[0]
        .authenticate;
    });

    it('replies with no credentials when security is disabled in elasticsearch', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createLifecycleResponseFactory();

      mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

      await authHandler(mockRequest, mockResponse, mockAuthToolkit);

      expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
      expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith();
      expect(mockResponse.redirected).not.toHaveBeenCalled();
      expect(mockResponse.internalError).not.toHaveBeenCalled();

      expect(authenticate).not.toHaveBeenCalled();
    });

    it('continues request with credentials on success', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createLifecycleResponseFactory();
      const mockUser = mockAuthenticatedUser();
      const mockAuthHeaders = { authorization: 'Basic xxx' };

      authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(mockUser, { authHeaders: mockAuthHeaders })
      );

      await authHandler(mockRequest, mockResponse, mockAuthToolkit);

      expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
      expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith({
        state: mockUser,
        requestHeaders: mockAuthHeaders,
      });
      expect(mockResponse.redirected).not.toHaveBeenCalled();
      expect(mockResponse.internalError).not.toHaveBeenCalled();

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(authenticate).toHaveBeenCalledWith(mockRequest);
    });

    it('returns authentication response headers on success if any', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createLifecycleResponseFactory();
      const mockUser = mockAuthenticatedUser();
      const mockAuthHeaders = { authorization: 'Basic xxx' };
      const mockAuthResponseHeaders = { 'WWW-Authenticate': 'Negotiate' };

      authenticate.mockResolvedValue(
        AuthenticationResult.succeeded(mockUser, {
          authHeaders: mockAuthHeaders,
          authResponseHeaders: mockAuthResponseHeaders,
        })
      );

      await authHandler(mockRequest, mockResponse, mockAuthToolkit);

      expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
      expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith({
        state: mockUser,
        requestHeaders: mockAuthHeaders,
        responseHeaders: mockAuthResponseHeaders,
      });
      expect(mockResponse.redirected).not.toHaveBeenCalled();
      expect(mockResponse.internalError).not.toHaveBeenCalled();

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(authenticate).toHaveBeenCalledWith(mockRequest);
    });

    it('redirects user if redirection is requested by the authenticator', async () => {
      const mockResponse = httpServerMock.createLifecycleResponseFactory();
      authenticate.mockResolvedValue(AuthenticationResult.redirectTo('/some/url'));

      await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

      expect(mockResponse.redirected).toHaveBeenCalledTimes(1);
      expect(mockResponse.redirected).toHaveBeenCalledWith({
        headers: { location: '/some/url' },
      });
      expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
      expect(mockResponse.internalError).not.toHaveBeenCalled();
    });

    it('rejects with `Internal Server Error` and log error when `authenticate` throws unhandled exception', async () => {
      const mockResponse = httpServerMock.createLifecycleResponseFactory();
      authenticate.mockRejectedValue(new Error('something went wrong'));

      await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

      expect(mockResponse.internalError).toHaveBeenCalledTimes(1);
      const [[error]] = mockResponse.internalError.mock.calls;
      expect(error).toBeUndefined();

      expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
      expect(mockResponse.redirected).not.toHaveBeenCalled();
      expect(loggingServiceMock.collect(mockSetupAuthenticationParams.loggers).error)
        .toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: something went wrong],
          ],
        ]
      `);
    });

    it('rejects with original `badRequest` error when `authenticate` fails to authenticate user', async () => {
      const mockResponse = httpServerMock.createLifecycleResponseFactory();
      const esError = Boom.badRequest('some message');
      authenticate.mockResolvedValue(AuthenticationResult.failed(esError));

      await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

      expect(mockResponse.customError).toHaveBeenCalledTimes(1);
      const [[response]] = mockResponse.customError.mock.calls;
      expect(response.body).toBe(esError);

      expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
      expect(mockResponse.redirected).not.toHaveBeenCalled();
    });

    it('includes `WWW-Authenticate` header if `authenticate` fails to authenticate user and provides challenges', async () => {
      const mockResponse = httpServerMock.createLifecycleResponseFactory();
      const originalError = Boom.unauthorized('some message');
      originalError.output.headers['WWW-Authenticate'] = [
        'Basic realm="Access to prod", charset="UTF-8"',
        'Basic',
        'Negotiate',
      ] as any;
      authenticate.mockResolvedValue(
        AuthenticationResult.failed(originalError, {
          authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
        })
      );

      await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

      expect(mockResponse.customError).toHaveBeenCalledTimes(1);
      const [[options]] = mockResponse.customError.mock.calls;
      expect(options.body).toBe(originalError);
      expect(options!.headers).toEqual({ 'WWW-Authenticate': 'Negotiate' });

      expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
      expect(mockResponse.redirected).not.toHaveBeenCalled();
    });

    it('returns `unauthorized` when authentication can not be handled', async () => {
      const mockResponse = httpServerMock.createLifecycleResponseFactory();
      authenticate.mockResolvedValue(AuthenticationResult.notHandled());

      await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

      expect(mockResponse.unauthorized).toHaveBeenCalledTimes(1);
      const [[response]] = mockResponse.unauthorized.mock.calls;

      expect(response!.body).toBeUndefined();

      expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
      expect(mockResponse.redirected).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUser()', () => {
    let getCurrentUser: (r: KibanaRequest) => Promise<AuthenticatedUser | null>;
    beforeEach(async () => {
      getCurrentUser = (await setupAuthentication(mockSetupAuthenticationParams)).getCurrentUser;
    });

    it('returns `null` if Security is disabled', async () => {
      mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

      await expect(getCurrentUser(httpServerMock.createKibanaRequest())).resolves.toBe(null);
    });

    it('fails if `authenticate` call fails', async () => {
      const failureReason = new Error('Something went wrong');
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);

      await expect(getCurrentUser(httpServerMock.createKibanaRequest())).rejects.toBe(
        failureReason
      );
    });

    it('returns result of `authenticate` call.', async () => {
      const mockUser = mockAuthenticatedUser();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(mockUser);

      await expect(getCurrentUser(httpServerMock.createKibanaRequest())).resolves.toBe(mockUser);
    });
  });

  describe('isAuthenticated()', () => {
    let isAuthenticated: (r: KibanaRequest) => Promise<boolean>;
    beforeEach(async () => {
      isAuthenticated = (await setupAuthentication(mockSetupAuthenticationParams)).isAuthenticated;
    });

    it('returns `true` if Security is disabled', async () => {
      mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

      await expect(isAuthenticated(httpServerMock.createKibanaRequest())).resolves.toBe(true);
    });

    it('returns `true` if `authenticate` succeeds.', async () => {
      const mockUser = mockAuthenticatedUser();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(mockUser);

      await expect(isAuthenticated(httpServerMock.createKibanaRequest())).resolves.toBe(true);
    });

    it('returns `false` if `authenticate` fails with 401.', async () => {
      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);

      await expect(isAuthenticated(httpServerMock.createKibanaRequest())).resolves.toBe(false);
    });

    it('fails if `authenticate` call fails with unknown reason', async () => {
      const failureReason = new errors.BadRequest();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);

      await expect(isAuthenticated(httpServerMock.createKibanaRequest())).rejects.toBe(
        failureReason
      );
    });
  });

  describe('createAPIKey()', () => {
    let createAPIKey: (
      request: KibanaRequest,
      params: CreateAPIKeyParams
    ) => Promise<CreateAPIKeyResult | null>;
    beforeEach(async () => {
      createAPIKey = (await setupAuthentication(mockSetupAuthenticationParams)).createAPIKey;
    });

    it('calls createAPIKey with given arguments', async () => {
      const request = httpServerMock.createKibanaRequest();
      const apiKeysInstance = jest.requireMock('./api_keys').APIKeys.mock.instances[0];
      const params = {
        name: 'my-key',
        role_descriptors: {},
        expiration: '1d',
      };
      apiKeysInstance.create.mockResolvedValueOnce({ success: true });
      await expect(createAPIKey(request, params)).resolves.toEqual({
        success: true,
      });
      expect(apiKeysInstance.create).toHaveBeenCalledWith(request, params);
    });
  });

  describe('invalidateAPIKey()', () => {
    let invalidateAPIKey: (
      request: KibanaRequest,
      params: InvalidateAPIKeyParams
    ) => Promise<InvalidateAPIKeyResult | null>;
    beforeEach(async () => {
      invalidateAPIKey = (await setupAuthentication(mockSetupAuthenticationParams))
        .invalidateAPIKey;
    });

    it('calls invalidateAPIKey with given arguments', async () => {
      const request = httpServerMock.createKibanaRequest();
      const apiKeysInstance = jest.requireMock('./api_keys').APIKeys.mock.instances[0];
      const params = {
        id: '123',
      };
      apiKeysInstance.invalidate.mockResolvedValueOnce({ success: true });
      await expect(invalidateAPIKey(request, params)).resolves.toEqual({
        success: true,
      });
      expect(apiKeysInstance.invalidate).toHaveBeenCalledWith(request, params);
    });
  });
});
