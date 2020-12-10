/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./authenticator');

import Boom from '@hapi/boom';
import type { PublicMethodsOf } from '@kbn/utility-types';

import {
  loggingSystemMock,
  coreMock,
  httpServerMock,
  httpServiceMock,
  elasticsearchServiceMock,
} from '../../../../../src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { auditServiceMock, securityAuditLoggerMock } from '../audit/index.mock';
import { securityFeatureUsageServiceMock } from '../feature_usage/index.mock';
import { sessionMock } from '../session_management/session.mock';

import type {
  AuthenticationHandler,
  AuthToolkit,
  ILegacyClusterClient,
  KibanaRequest,
  Logger,
  LoggerFactory,
  LegacyScopedClusterClient,
  HttpServiceSetup,
  HttpServiceStart,
} from '../../../../../src/core/server';
import type { AuthenticatedUser } from '../../common/model';
import type { SecurityLicense } from '../../common/licensing';
import type { AuditServiceSetup, SecurityAuditLogger } from '../audit';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';
import { ConfigSchema, ConfigType, createConfig } from '../config';
import { AuthenticationResult } from './authentication_result';
import { AuthenticationService } from './authentication_service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let logger: jest.Mocked<Logger>;
  let mockSetupAuthenticationParams: {
    legacyAuditLogger: jest.Mocked<SecurityAuditLogger>;
    audit: jest.Mocked<AuditServiceSetup>;
    config: ConfigType;
    loggers: LoggerFactory;
    http: jest.Mocked<HttpServiceSetup>;
    clusterClient: jest.Mocked<ILegacyClusterClient>;
    license: jest.Mocked<SecurityLicense>;
    getFeatureUsageService: () => jest.Mocked<SecurityFeatureUsageServiceStart>;
    session: jest.Mocked<PublicMethodsOf<Session>>;
  };
  let mockScopedClusterClient: jest.Mocked<PublicMethodsOf<LegacyScopedClusterClient>>;
  beforeEach(() => {
    logger = loggingSystemMock.createLogger();

    mockSetupAuthenticationParams = {
      legacyAuditLogger: securityAuditLoggerMock.create(),
      audit: auditServiceMock.create(),
      http: coreMock.createSetup().http,
      config: createConfig(
        ConfigSchema.validate({
          encryptionKey: 'ab'.repeat(16),
          secureCookies: true,
          cookieName: 'my-sid-cookie',
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: false }
      ),
      clusterClient: elasticsearchServiceMock.createLegacyClusterClient(),
      license: licenseMock.create(),
      loggers: loggingSystemMock.create(),
      getFeatureUsageService: jest
        .fn()
        .mockReturnValue(securityFeatureUsageServiceMock.createStartContract()),
      session: sessionMock.create(),
    };

    mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    mockSetupAuthenticationParams.clusterClient.asScoped.mockReturnValue(
      (mockScopedClusterClient as unknown) as jest.Mocked<LegacyScopedClusterClient>
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

    describe('authentication handler', () => {
      let authHandler: AuthenticationHandler;
      let authenticate: jest.SpyInstance<Promise<AuthenticationResult>, [KibanaRequest]>;
      let mockAuthToolkit: jest.Mocked<AuthToolkit>;
      beforeEach(() => {
        mockAuthToolkit = httpServiceMock.createAuthToolkit();

        service.setup(mockSetupAuthenticationParams);

        expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledTimes(1);
        expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledWith(
          expect.any(Function)
        );

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
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
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
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
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
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
        expect(mockResponse.internalError).not.toHaveBeenCalled();

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
        expect(mockResponse.internalError).not.toHaveBeenCalled();
      });

      it('rejects with `Internal Server Error` and log error when `authenticate` throws unhandled exception', async () => {
        const mockResponse = httpServerMock.createLifecycleResponseFactory();
        const failureReason = new Error('something went wrong');
        authenticate.mockRejectedValue(failureReason);

        await authHandler(httpServerMock.createKibanaRequest(), mockResponse, mockAuthToolkit);

        expect(mockResponse.internalError).toHaveBeenCalledTimes(1);
        const [[error]] = mockResponse.internalError.mock.calls;
        expect(error).toBeUndefined();

        expect(mockAuthToolkit.authenticated).not.toHaveBeenCalled();
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(failureReason);
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
        expect(mockAuthToolkit.redirected).not.toHaveBeenCalled();
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

    describe('getCurrentUser()', () => {
      let getCurrentUser: (r: KibanaRequest) => AuthenticatedUser | null;
      beforeEach(async () => {
        getCurrentUser = service.setup(mockSetupAuthenticationParams).getCurrentUser;
      });

      it('returns `null` if Security is disabled', () => {
        mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

        expect(getCurrentUser(httpServerMock.createKibanaRequest())).toBe(null);
      });

      it('returns user from the auth state.', () => {
        const mockUser = mockAuthenticatedUser();

        const mockAuthGet = mockSetupAuthenticationParams.http.auth.get as jest.Mock;
        mockAuthGet.mockReturnValue({ state: mockUser });

        const mockRequest = httpServerMock.createKibanaRequest();
        expect(getCurrentUser(mockRequest)).toBe(mockUser);
        expect(mockAuthGet).toHaveBeenCalledTimes(1);
        expect(mockAuthGet).toHaveBeenCalledWith(mockRequest);
      });

      it('returns null if auth state is not available.', () => {
        const mockAuthGet = mockSetupAuthenticationParams.http.auth.get as jest.Mock;
        mockAuthGet.mockReturnValue({});

        const mockRequest = httpServerMock.createKibanaRequest();
        expect(getCurrentUser(mockRequest)).toBeNull();
        expect(mockAuthGet).toHaveBeenCalledTimes(1);
        expect(mockAuthGet).toHaveBeenCalledWith(mockRequest);
      });
    });
  });

  describe('#start()', () => {
    let mockStartAuthenticationParams: {
      http: jest.Mocked<HttpServiceStart>;
      clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
    };
    beforeEach(() => {
      const coreStart = coreMock.createStart();
      mockStartAuthenticationParams = {
        http: coreStart.http,
        clusterClient: elasticsearchServiceMock.createClusterClient(),
      };
      service.setup(mockSetupAuthenticationParams);
    });

    describe('getCurrentUser()', () => {
      let getCurrentUser: (r: KibanaRequest) => AuthenticatedUser | null;
      beforeEach(async () => {
        getCurrentUser = (await service.start(mockStartAuthenticationParams)).getCurrentUser;
      });

      it('returns `null` if Security is disabled', () => {
        mockSetupAuthenticationParams.license.isEnabled.mockReturnValue(false);

        expect(getCurrentUser(httpServerMock.createKibanaRequest())).toBe(null);
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
});
