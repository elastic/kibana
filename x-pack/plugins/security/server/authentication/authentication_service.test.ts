/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./authenticator');
jest.mock('./unauthenticated_page');

import { mockCanRedirectRequest } from './authentication_service.test.mocks';

import { errors } from '@elastic/elasticsearch';

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  AuthenticationHandler,
  AuthToolkit,
  ElasticsearchServiceSetup,
  HttpServiceSetup,
  HttpServiceStart,
  KibanaRequest,
  Logger,
  LoggerFactory,
  OnPreResponseToolkit,
  UnauthorizedError,
  UnauthorizedErrorHandler,
  UnauthorizedErrorHandlerToolkit,
} from 'src/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from 'src/core/server/mocks';

import type { AuthenticatedUser, SecurityLicense } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import type { AuditServiceSetup } from '../audit';
import { auditServiceMock } from '../audit/mocks';
import type { ConfigType } from '../config';
import { ConfigSchema, createConfig } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { securityFeatureUsageServiceMock } from '../feature_usage/index.mock';
import { securityMock } from '../mocks';
import { ROUTE_TAG_AUTH_FLOW } from '../routes/tags';
import type { Session } from '../session_management';
import { sessionMock } from '../session_management/session.mock';
import { AuthenticationResult } from './authentication_result';
import { AuthenticationService } from './authentication_service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let logger: jest.Mocked<Logger>;
  let mockSetupAuthenticationParams: {
    http: jest.Mocked<HttpServiceSetup>;
    elasticsearch: jest.Mocked<ElasticsearchServiceSetup>;
    config: ConfigType;
    license: jest.Mocked<SecurityLicense>;
    buildNumber: number;
  };
  let mockStartAuthenticationParams: {
    audit: jest.Mocked<AuditServiceSetup>;
    config: ConfigType;
    loggers: LoggerFactory;
    http: jest.Mocked<HttpServiceStart>;
    clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
    featureUsageService: jest.Mocked<SecurityFeatureUsageServiceStart>;
    session: jest.Mocked<PublicMethodsOf<Session>>;
  };
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();

    const coreSetupMock = coreMock.createSetup();
    const httpMock = coreSetupMock.http;
    (httpMock.basePath.prepend as jest.Mock).mockImplementation(
      (path) => `${httpMock.basePath.serverBasePath}${path}`
    );
    (httpMock.basePath.get as jest.Mock).mockImplementation(() => httpMock.basePath.serverBasePath);
    mockSetupAuthenticationParams = {
      http: httpMock,
      elasticsearch: coreSetupMock.elasticsearch,
      config: createConfig(ConfigSchema.validate({}), loggingSystemMock.create().get(), {
        isTLSEnabled: false,
      }),
      license: licenseMock.create(),
      buildNumber: 100500,
    };
    mockCanRedirectRequest.mockReturnValue(false);

    const coreStart = coreMock.createStart();
    mockStartAuthenticationParams = {
      audit: auditServiceMock.create(),
      config: createConfig(
        ConfigSchema.validate({
          encryptionKey: 'ab'.repeat(16),
          secureCookies: true,
          cookieName: 'my-sid-cookie',
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: false }
      ),
      http: coreStart.http,
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      loggers: loggingSystemMock.create(),
      featureUsageService: securityFeatureUsageServiceMock.createStartContract(),
      session: sessionMock.create(),
    };
    (mockStartAuthenticationParams.http.basePath.get as jest.Mock).mockImplementation(
      () => mockStartAuthenticationParams.http.basePath.serverBasePath
    );

    service = new AuthenticationService(logger);
  });

  afterEach(() => jest.clearAllMocks());

  describe('#setup()', () => {
    it('properly registers auth handler', () => {
      service.setup(mockSetupAuthenticationParams);

      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledTimes(1);
      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('properly registers unauthorized error handler', () => {
      service.setup(mockSetupAuthenticationParams);

      expect(
        mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler
      ).toHaveBeenCalledTimes(1);
      expect(
        mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler
      ).toHaveBeenCalledWith(expect.any(Function));
    });

    it('properly registers onPreResponse handler', () => {
      service.setup(mockSetupAuthenticationParams);

      expect(mockSetupAuthenticationParams.http.registerOnPreResponse).toHaveBeenCalledTimes(1);
      expect(mockSetupAuthenticationParams.http.registerOnPreResponse).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('properly registers auth handler with no providers', () => {
      mockSetupAuthenticationParams.config.authc = {
        ...mockSetupAuthenticationParams.config.authc,
        sortedProviders: [],
      };
      service.setup(mockSetupAuthenticationParams);

      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledTimes(1);
      expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('#start()', () => {
    beforeEach(() => {
      service.setup(mockSetupAuthenticationParams);
    });

    describe('authentication handler', () => {
      let authHandler: AuthenticationHandler;
      let authenticate: jest.SpyInstance<Promise<AuthenticationResult>, [KibanaRequest]>;
      let mockAuthToolkit: jest.Mocked<AuthToolkit>;
      beforeEach(() => {
        mockAuthToolkit = httpServiceMock.createAuthToolkit();

        service.start(mockStartAuthenticationParams);

        authHandler = mockSetupAuthenticationParams.http.registerAuth.mock.calls[0][0];
        authenticate =
          jest.requireMock('./authenticator').Authenticator.mock.instances[0].authenticate;
      });

      it('returns error if license is not available.', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();

        mockSetupAuthenticationParams.license.isLicenseAvailable.mockReturnValue(false);

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockResponse.customError).toHaveBeenCalledTimes(1);
        expect(mockResponse.customError).toHaveBeenCalledWith({
          body: 'License is not available.',
          statusCode: 503,
          headers: { 'Retry-After': '30' },
        });
        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('replies with no credentials when security is disabled in elasticsearch', async () => {
        const mockRequest = httpServerMock.createKibanaRequest();
        const mockResponse = httpServerMock.createLifecycleResponseFactory();

        mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

        await authHandler(mockRequest, mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.authenticated).toHaveBeenCalledTimes(1);
        expect(mockAuthToolkit.authenticated).toHaveBeenCalledWith();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();

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
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();

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
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();

        expect(authenticate).toHaveBeenCalledTimes(1);
        expect(authenticate).toHaveBeenCalledWith(mockRequest);
      });

      it('redirects user if redirection is requested by the authenticator preserving authentication response headers if any', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        authenticate.mockResolvedValue(
          AuthenticationResult.redirectTo('/some/url', {
            authResponseHeaders: { 'WWW-Authenticate': 'Negotiate' },
          })
        );

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.redirected).toHaveBeenCalledTimes(1);
        expect(mockAuthToolkit.redirected).toHaveBeenCalledWith({
          location: '/some/url',
          'WWW-Authenticate': 'Negotiate',
        });
        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
      });

      it('rejects with `Internal Server Error` and log error when `authenticate` throws unhandled exception', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const failureReason = new Error('something went wrong');
        authenticate.mockRejectedValue(failureReason);

        await expect(
          authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit)
        ).rejects.toThrow(failureReason);

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('rejects with original `badRequest` error when `authenticate` fails to authenticate user', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const esError = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 400, body: 'some message' })
        );
        authenticate.mockResolvedValue(AuthenticationResult.failed(esError));

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockResponse.customError).toHaveBeenCalledTimes(1);
        const [[response]] = mockResponse.customError.mock.calls;
        expect(response.body).toBe(esError);

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('includes `WWW-Authenticate` header if `authenticate` fails to authenticate user and provides challenges', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const originalError = new errors.ResponseError(
          securityMock.createApiResponse({
            statusCode: 403,
            body: 'some message',
            headers: {
              'WWW-Authenticate': [
                'Basic realm="Access to prod", charset="UTF-8"',
                'Basic',
                'Negotiate',
              ],
            },
          })
        );
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
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });

      it('returns `notHandled` when authentication can not be handled', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        authenticate.mockResolvedValue(AuthenticationResult.notHandled());

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockAuthToolkit.notHandled).toHaveBeenCalledTimes(1);

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
      });
    });

    describe('unauthorized error handler', () => {
      let unauthorizedErrorHandler: UnauthorizedErrorHandler;
      let reauthenticate: jest.SpyInstance<Promise<AuthenticationResult>, [KibanaRequest]>;
      let mockUnauthorizedErrorToolkit: jest.Mocked<UnauthorizedErrorHandlerToolkit>;
      beforeEach(() => {
        mockUnauthorizedErrorToolkit = { notHandled: jest.fn(), retry: jest.fn() };

        service.start(mockStartAuthenticationParams);

        unauthorizedErrorHandler =
          mockSetupAuthenticationParams.elasticsearch.setUnauthorizedErrorHandler.mock.calls[0][0];
        reauthenticate =
          jest.requireMock('./authenticator').Authenticator.mock.instances[0].reauthenticate;
      });

      it('does not handle error if license is not available.', async () => {
        mockSetupAuthenticationParams.license.isLicenseAvailable.mockReturnValue(false);

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        ) as UnauthorizedError;

        await unauthorizedErrorHandler(
          { error: failureReason, request: httpServerMock.createKibanaRequest() },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();
        expect(reauthenticate).not.toHaveBeenCalled();
      });

      it('does not handle error when security is disabled in elasticsearch.', async () => {
        mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        ) as UnauthorizedError;

        await unauthorizedErrorHandler(
          { error: failureReason, request: httpServerMock.createKibanaRequest() },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();
        expect(reauthenticate).not.toHaveBeenCalled();
      });

      it('does not handle non-401 errors.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 403, body: {} })
        ) as UnauthorizedError;

        await unauthorizedErrorHandler(
          { error: failureReason, request: httpServerMock.createKibanaRequest() },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();
        expect(reauthenticate).not.toHaveBeenCalled();
      });

      it('does not handle error unless provider successfully returns new headers.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        ) as UnauthorizedError;

        const nonHandleableResults = [
          AuthenticationResult.notHandled(),
          AuthenticationResult.failed(
            new errors.ResponseError(securityMock.createApiResponse({ statusCode: 404, body: {} }))
          ),
          AuthenticationResult.redirectTo('some-url'),
          AuthenticationResult.succeeded(mockAuthenticatedUser(), {
            authResponseHeaders: { header: 'value' },
          }),
        ];

        const mockRequest = httpServerMock.createKibanaRequest();
        for (const result of nonHandleableResults) {
          reauthenticate.mockResolvedValue(result);

          await unauthorizedErrorHandler(
            { error: failureReason, request: mockRequest },
            mockUnauthorizedErrorToolkit
          );

          expect(mockUnauthorizedErrorToolkit.notHandled).toHaveBeenCalledTimes(1);
          expect(mockUnauthorizedErrorToolkit.retry).not.toHaveBeenCalled();

          expect(reauthenticate).toHaveBeenCalledTimes(1);
          expect(reauthenticate).toHaveBeenCalledWith(mockRequest);

          mockUnauthorizedErrorToolkit.notHandled.mockClear();
          reauthenticate.mockClear();
        }
      });

      it('handles error if authentication succeeds and authentication headers are available.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        ) as UnauthorizedError;

        reauthenticate.mockResolvedValue(
          AuthenticationResult.succeeded(mockAuthenticatedUser(), {
            authHeaders: { header: 'value' },
          })
        );

        const mockRequest = httpServerMock.createKibanaRequest();
        await unauthorizedErrorHandler(
          { error: failureReason, request: mockRequest },
          mockUnauthorizedErrorToolkit
        );

        expect(mockUnauthorizedErrorToolkit.retry).toHaveBeenCalledTimes(1);
        expect(mockUnauthorizedErrorToolkit.retry).toHaveBeenCalledWith({
          authHeaders: { header: 'value' },
        });
        expect(mockUnauthorizedErrorToolkit.notHandled).not.toHaveBeenCalled();

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest);
      });

      it('filters out and recovers `Authorization` header when provider cannot handle error.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        ) as UnauthorizedError;

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { Authorization: 'Basic xxx', Random: 'random' },
        });

        let modifiedHeaders;
        reauthenticate.mockImplementation((request) => {
          modifiedHeaders = request.headers;
          return Promise.resolve(AuthenticationResult.notHandled());
        });

        await unauthorizedErrorHandler(
          { error: failureReason, request: mockRequest },
          mockUnauthorizedErrorToolkit
        );

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest);
        expect(modifiedHeaders).toEqual({ Random: 'random' });

        expect(mockRequest.headers).toEqual({ Authorization: 'Basic xxx', Random: 'random' });
      });

      it('filters out and recovers `Authorization` header when provider can handle error.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        ) as UnauthorizedError;

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { Authorization: 'Basic xxx', Random: 'random' },
        });

        let modifiedHeaders;
        reauthenticate.mockImplementation((request) => {
          modifiedHeaders = request.headers;
          return Promise.resolve(
            AuthenticationResult.succeeded(mockAuthenticatedUser(), {
              authHeaders: { header: 'value' },
            })
          );
        });

        await unauthorizedErrorHandler(
          { error: failureReason, request: mockRequest },
          mockUnauthorizedErrorToolkit
        );

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest);
        expect(modifiedHeaders).toEqual({ Random: 'random' });

        expect(mockRequest.headers).toEqual({ Authorization: 'Basic xxx', Random: 'random' });
      });

      it('filters out and recovers `Authorization` header when provider fails with unexpected error.', async () => {
        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        ) as UnauthorizedError;

        const mockRequest = httpServerMock.createKibanaRequest({
          headers: { Authorization: 'Basic xxx', Random: 'random' },
        });

        let modifiedHeaders;
        reauthenticate.mockImplementation((request) => {
          modifiedHeaders = request.headers;
          return Promise.reject(new Error('Uh oh.'));
        });

        await expect(
          unauthorizedErrorHandler(
            { error: failureReason, request: mockRequest },
            mockUnauthorizedErrorToolkit
          )
        ).rejects.toThrow(new Error('Uh oh.'));

        expect(reauthenticate).toHaveBeenCalledTimes(1);
        expect(reauthenticate).toHaveBeenCalledWith(mockRequest);
        expect(modifiedHeaders).toEqual({ Random: 'random' });

        expect(mockRequest.headers).toEqual({ Authorization: 'Basic xxx', Random: 'random' });
      });
    });

    describe('getServerBaseURL()', () => {
      let getServerBaseURL: () => string;
      beforeEach(() => {
        mockStartAuthenticationParams.http.getServerInfo.mockReturnValue({
          name: 'some-name',
          protocol: 'socket',
          hostname: 'test-hostname',
          port: 1234,
        });

        service.setup(mockSetupAuthenticationParams);
        service.start(mockStartAuthenticationParams);

        getServerBaseURL =
          jest.requireMock('./authenticator').Authenticator.mock.calls[0][0].getServerBaseURL;
      });

      it('falls back to legacy server config if `public` config is not specified', async () => {
        expect(getServerBaseURL()).toBe('socket://test-hostname:1234');
      });

      it('respects `public` config if it is specified', async () => {
        mockStartAuthenticationParams.config.public = {
          protocol: 'https',
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('https://test-hostname:1234');

        mockStartAuthenticationParams.config.public = {
          hostname: 'elastic.co',
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('socket://elastic.co:1234');

        mockStartAuthenticationParams.config.public = {
          port: 4321,
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('socket://test-hostname:4321');

        mockStartAuthenticationParams.config.public = {
          protocol: 'https',
          hostname: 'elastic.co',
          port: 4321,
        } as ConfigType['public'];
        expect(getServerBaseURL()).toBe('https://elastic.co:4321');
      });
    });

    describe('getCurrentUser()', () => {
      let getCurrentUser: (r: KibanaRequest) => AuthenticatedUser | null;
      beforeEach(async () => {
        getCurrentUser = service.start(mockStartAuthenticationParams).getCurrentUser;
      });

      it('returns user from the auth state.', () => {
        const mockUser = mockAuthenticatedUser();

        const mockAuthGet = mockStartAuthenticationParams.http.auth.get as jest.Mock;
        mockAuthGet.mockReturnValue({ state: mockUser });

        const mockRequest = httpServerMock.createKibanaRequest();
        expect(getCurrentUser(mockRequest)).toBe(mockUser);
        expect(mockAuthGet).toHaveBeenCalledTimes(1);
        expect(mockAuthGet).toHaveBeenCalledWith(mockRequest);
      });

      it('returns null if auth state is not available.', () => {
        const mockAuthGet = mockStartAuthenticationParams.http.auth.get as jest.Mock;
        mockAuthGet.mockReturnValue({});

        const mockRequest = httpServerMock.createKibanaRequest();
        expect(getCurrentUser(mockRequest)).toBeNull();
        expect(mockAuthGet).toHaveBeenCalledTimes(1);
        expect(mockAuthGet).toHaveBeenCalledWith(mockRequest);
      });
    });
  });

  describe('onPreResponse handler', () => {
    function getService({ runStart = true }: { runStart?: boolean } = {}) {
      service.setup(mockSetupAuthenticationParams);

      if (runStart) {
        service.start(mockStartAuthenticationParams);
      }

      const onPreResponseHandler =
        mockSetupAuthenticationParams.http.registerOnPreResponse.mock.calls[0][0];
      const [authenticator] = jest.requireMock('./authenticator').Authenticator.mock.instances;

      return { authenticator, onPreResponseHandler };
    }

    it('ignores responses with non-401 status code', async () => {
      const mockReturnedValue = { type: 'next' as any };
      const mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
      mockOnPreResponseToolkit.next.mockReturnValue(mockReturnedValue);

      const { onPreResponseHandler } = getService();
      for (const statusCode of [200, 400, 403, 404]) {
        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest(),
            { statusCode },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);
      }
    });

    it('ignores responses to requests that cannot handle redirects', async () => {
      const mockReturnedValue = { type: 'next' as any };
      const mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
      mockOnPreResponseToolkit.next.mockReturnValue(mockReturnedValue);
      mockCanRedirectRequest.mockReturnValue(false);

      const { onPreResponseHandler } = getService();
      await expect(
        onPreResponseHandler(
          httpServerMock.createKibanaRequest(),
          { statusCode: 401 },
          mockOnPreResponseToolkit
        )
      ).resolves.toBe(mockReturnedValue);
    });

    it('ignores responses if authenticator is not initialized', async () => {
      // Run `setup`, but not `start` to simulate non-initialized `Authenticator`.
      const { onPreResponseHandler } = getService({ runStart: false });

      const mockReturnedValue = { type: 'next' as any };
      const mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
      mockOnPreResponseToolkit.next.mockReturnValue(mockReturnedValue);
      mockCanRedirectRequest.mockReturnValue(true);

      await expect(
        onPreResponseHandler(
          httpServerMock.createKibanaRequest(),
          { statusCode: 401 },
          mockOnPreResponseToolkit
        )
      ).resolves.toBe(mockReturnedValue);
    });

    describe('when login form is available', () => {
      let mockReturnedValue: { type: any; body: string };
      let mockOnPreResponseToolkit: jest.Mocked<OnPreResponseToolkit>;
      beforeEach(() => {
        mockReturnedValue = { type: 'render' as any, body: 'body' };
        mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
        mockOnPreResponseToolkit.render.mockReturnValue(mockReturnedValue);
      });

      it('redirects to the login page when user does not have an active session', async () => {
        mockCanRedirectRequest.mockReturnValue(true);

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('performs logout if user has an active session', async () => {
        mockStartAuthenticationParams.session.getSID.mockResolvedValue('some-sid');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
            Refresh:
              '0;url=/mock-server-basepath/logout?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('does not preserve path for the authentication flow paths', async () => {
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/api/security/saml/callback',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2F',
          },
        });
      });
    });

    describe('when login selector is available', () => {
      let mockReturnedValue: { type: any; body: string };
      let mockOnPreResponseToolkit: jest.Mocked<OnPreResponseToolkit>;
      beforeEach(() => {
        mockReturnedValue = { type: 'render' as any, body: 'body' };
        mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
        mockOnPreResponseToolkit.render.mockReturnValue(mockReturnedValue);

        mockSetupAuthenticationParams.config = createConfig(
          ConfigSchema.validate({
            authc: {
              providers: {
                saml: { saml1: { order: 0, realm: 'saml1' } },
                basic: { basic1: { order: 1 } },
              },
            },
          }),
          loggingSystemMock.create().get(),
          { isTLSEnabled: false }
        );
      });

      it('redirects to the login page when user does not have an active session', async () => {
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('performs logout if user has an active session', async () => {
        mockStartAuthenticationParams.session.getSID.mockResolvedValue('some-sid');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
            Refresh:
              '0;url=/mock-server-basepath/logout?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2Fapp%2Fsome',
          },
        });
      });

      it('does not preserve path for the authentication flow paths', async () => {
        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/api/security/saml/callback',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: '<div/>',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
            Refresh:
              '0;url=/mock-server-basepath/login?msg=UNAUTHENTICATED&next=%2Fmock-server-basepath%2F',
          },
        });
      });
    });

    describe('when neither login selector nor login form is available', () => {
      let mockReturnedValue: { type: any; body: string };
      let mockOnPreResponseToolkit: jest.Mocked<OnPreResponseToolkit>;
      beforeEach(() => {
        mockReturnedValue = { type: 'render' as any, body: 'body' };
        mockOnPreResponseToolkit = httpServiceMock.createOnPreResponseToolkit();
        mockOnPreResponseToolkit.render.mockReturnValue(mockReturnedValue);

        mockSetupAuthenticationParams.config = createConfig(
          ConfigSchema.validate({
            authc: { providers: { saml: { saml1: { order: 0, realm: 'saml1' } } } },
          }),
          loggingSystemMock.create().get(),
          { isTLSEnabled: false }
        );
      });

      it('renders unauthenticated page if user does not have an active session', async () => {
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: 'rendered-view',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
          },
        });

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          buildNumber: 100500,
          originalURL: '/mock-server-basepath/app/some',
        });
      });

      it('renders unauthenticated page if user has an active session', async () => {
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');
        mockStartAuthenticationParams.session.getSID.mockResolvedValue('some-sid');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({ path: '/app/some', query: { param: 'one two' } }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: 'rendered-view',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
          },
        });

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          buildNumber: 100500,
          originalURL: '/mock-server-basepath/app/some',
        });
      });

      it('does not preserve path for the authentication flow paths', async () => {
        const mockRenderUnauthorizedPage = jest
          .requireMock('./unauthenticated_page')
          .renderUnauthenticatedPage.mockReturnValue('rendered-view');

        const { authenticator, onPreResponseHandler } = getService();
        authenticator.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/app/some');
        mockCanRedirectRequest.mockReturnValue(true);

        await expect(
          onPreResponseHandler(
            httpServerMock.createKibanaRequest({
              path: '/api/security/saml/callback',
              query: { param: 'one two' },
              routeTags: [ROUTE_TAG_AUTH_FLOW],
            }),
            { statusCode: 401 },
            mockOnPreResponseToolkit
          )
        ).resolves.toBe(mockReturnedValue);

        expect(mockOnPreResponseToolkit.render).toHaveBeenCalledWith({
          body: 'rendered-view',
          headers: {
            'Content-Security-Policy': `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`,
          },
        });

        expect(mockRenderUnauthorizedPage).toHaveBeenCalledWith({
          basePath: mockSetupAuthenticationParams.http.basePath,
          buildNumber: 100500,
          originalURL: '/mock-server-basepath/',
        });
      });
    });
  });
});
