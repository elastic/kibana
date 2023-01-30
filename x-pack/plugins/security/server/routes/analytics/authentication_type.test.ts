/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { RouteDefinitionParams } from '..';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { HTTPAuthenticationProvider, TokenAuthenticationProvider } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import type { SecurityRequestHandlerContext } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineRecordAnalyticsOnAuthTypeRoutes } from './authentication_type';

const FAKE_TIMESTAMP = 1637665318135;

function getMockContext(
  licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
) {
  return {
    licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
  } as unknown as SecurityRequestHandlerContext;
}

describe('POST /internal/security/analytics/_record_auth_type', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(FAKE_TIMESTAMP);
  });

  let routeHandler: RequestHandler<any, any, any, any>;
  let routeParamsMock: DeeplyMockedKeys<RouteDefinitionParams>;

  beforeEach(() => {
    routeParamsMock = routeDefinitionParamsMock.create();
    defineRecordAnalyticsOnAuthTypeRoutes(routeParamsMock);

    const [, recordAnalyticsOnAuthTypeRouteHandler] = routeParamsMock.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/analytics/_record_auth_type'
    )!;
    routeHandler = recordAnalyticsOnAuthTypeRouteHandler;
  });

  it('does not report authentication type if user cannot be authenticated', async () => {
    const request = httpServerMock.createKibanaRequest();
    const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

    expect(response.status).toBe(204);
    expect(routeParamsMock.logger.warn).toBeCalledWith(
      'Cannot record authentication type: current user could not be retrieved.'
    );

    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).not.toHaveBeenCalled();
  });

  it('reports authentication type for a new user', async () => {
    const request = httpServerMock.createKibanaRequest();

    const mockAuthc = authenticationServiceMock.createStart();
    mockAuthc.getCurrentUser.mockReturnValue(mockAuthenticatedUser());
    routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

    const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      timestamp: FAKE_TIMESTAMP,
      signature: '139e39121f10f5ce5275883f6b65cd511f1cd51ec71464558a376731bb9b0630',
    });

    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(1);
    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
      authenticationProviderType: 'basic',
      authenticationRealmType: 'native',
    });
  });

  it('does not report authentication type for the same user within first 12 hours', async () => {
    const initialRequest = httpServerMock.createKibanaRequest();

    const mockAuthc = authenticationServiceMock.createStart();
    mockAuthc.getCurrentUser.mockReturnValue(mockAuthenticatedUser());
    routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

    const initialResponse = await routeHandler(
      getMockContext(),
      initialRequest,
      kibanaResponseFactory
    );
    expect(initialResponse.status).toBe(200);
    expect(initialResponse.payload).toEqual({
      timestamp: FAKE_TIMESTAMP,
      signature: '139e39121f10f5ce5275883f6b65cd511f1cd51ec71464558a376731bb9b0630',
    });

    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(1);
    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
      authenticationProviderType: 'basic',
      authenticationRealmType: 'native',
    });
    routeParamsMock.analyticsService.reportAuthenticationTypeEvent.mockClear();

    const secondRequest = httpServerMock.createKibanaRequest({
      body: {
        timestamp: initialResponse.payload.timestamp - 11 * 60 * 60 * 1000,
        signature: initialResponse.payload.signature,
      },
    });
    const secondResponse = await routeHandler(
      getMockContext(),
      secondRequest,
      kibanaResponseFactory
    );
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.payload).toEqual({
      timestamp: initialResponse.payload.timestamp - 11 * 60 * 60 * 1000,
      signature: '139e39121f10f5ce5275883f6b65cd511f1cd51ec71464558a376731bb9b0630',
    });

    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).not.toHaveBeenCalled();
  });

  describe('re-report authentication type', () => {
    let initialTimestamp: number;
    let initialSignature: string;
    beforeEach(async () => {
      const mockAuthc = authenticationServiceMock.createStart();
      mockAuthc.getCurrentUser.mockReturnValue(mockAuthenticatedUser());
      routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        timestamp: FAKE_TIMESTAMP,
        signature: '139e39121f10f5ce5275883f6b65cd511f1cd51ec71464558a376731bb9b0630',
      });
      routeParamsMock.analyticsService.reportAuthenticationTypeEvent.mockClear();

      initialTimestamp = response.payload.timestamp;
      initialSignature = response.payload.signature;
    });

    it('for the same user after 12 hours', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: { timestamp: initialTimestamp - 13 * 60 * 60 * 1000, signature: initialSignature },
      });
      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        timestamp: initialTimestamp,
        signature: initialSignature,
      });

      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(
        1
      );
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
        authenticationProviderType: 'basic',
        authenticationRealmType: 'native',
      });
    });

    it('if username changes', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: { timestamp: initialTimestamp - 1000, signature: initialSignature },
      });

      const mockAuthc = authenticationServiceMock.createStart();
      mockAuthc.getCurrentUser.mockReturnValue(mockAuthenticatedUser({ username: 'new-username' }));
      routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        timestamp: initialTimestamp,
        signature: '614d8f0280b2b117d6004411d048702746d412af5e5817677149718725cdb0fd',
      });
      expect(response.payload.signature).not.toEqual(initialSignature);

      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(
        1
      );
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
        authenticationProviderType: 'basic',
        authenticationRealmType: 'native',
      });
    });

    it('if Kibana provider changes', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: { timestamp: initialTimestamp - 1000, signature: initialSignature },
      });

      const mockAuthc = authenticationServiceMock.createStart();
      mockAuthc.getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_provider: { type: TokenAuthenticationProvider.type, name: 'token' },
        })
      );
      routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        timestamp: initialTimestamp,
        signature: '7a5738db93df725d8550fce1e922a6cd7d3b3b6d2484e1ef4584735c23501139',
      });
      expect(response.payload.signature).not.toEqual(initialSignature);

      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(
        1
      );
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
        authenticationProviderType: 'token',
        authenticationRealmType: 'native',
      });
    });

    it('if Elasticsearch realm changes', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: { timestamp: initialTimestamp - 1000, signature: initialSignature },
      });

      const mockAuthc = authenticationServiceMock.createStart();
      mockAuthc.getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({ authentication_realm: { type: 'file', name: 'file1' } })
      );
      routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        timestamp: initialTimestamp,
        signature: '583bd29b2db33abf51ff8eb585bd09128115f47c33a5a4a1b8d2135bdbeab5fd',
      });
      expect(response.payload.signature).not.toEqual(initialSignature);

      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(
        1
      );
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
        authenticationProviderType: 'basic',
        authenticationRealmType: 'file',
      });
    });
  });

  it('reports HTTP scheme for a new user', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'Bearer token' },
    });

    const mockAuthc = authenticationServiceMock.createStart();
    mockAuthc.getCurrentUser.mockReturnValue(
      mockAuthenticatedUser({
        authentication_provider: { type: HTTPAuthenticationProvider.type, name: '__http__' },
      })
    );
    routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

    const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      timestamp: FAKE_TIMESTAMP,
      signature: 'f4f6b485690816127c33d5aa13cd6cd12c9892641ba23b5d58e5c6590cd43db0',
    });

    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(1);
    expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
      authenticationProviderType: 'http',
      authenticationRealmType: 'native',
      httpAuthenticationScheme: 'Bearer',
    });
  });

  describe('re-report authentication type for HTTP authentication', () => {
    let initialTimestamp: number;
    let initialSignature: string;
    beforeEach(async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer token' },
      });

      const mockAuthc = authenticationServiceMock.createStart();
      mockAuthc.getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_provider: { type: HTTPAuthenticationProvider.type, name: '__http__' },
        })
      );
      routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        timestamp: FAKE_TIMESTAMP,
        signature: 'f4f6b485690816127c33d5aa13cd6cd12c9892641ba23b5d58e5c6590cd43db0',
      });

      routeParamsMock.analyticsService.reportAuthenticationTypeEvent.mockClear();

      initialTimestamp = response.payload.timestamp;
      initialSignature = response.payload.signature;
    });

    it('if HTTP authentication scheme changes', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Custom token' },
        body: { timestamp: initialTimestamp - 1000, signature: initialSignature },
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        timestamp: initialTimestamp,
        signature: '46d5841ad21d29ca6c7c1c639adc6294c176c394adb0b40dfc05797cfe29218e',
      });
      expect(response.payload.signature).not.toEqual(initialSignature);
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(
        1
      );
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
        authenticationProviderType: 'http',
        authenticationRealmType: 'native',
        httpAuthenticationScheme: 'Custom',
      });
    });
  });

  describe('logApiKeyWithInteractiveUserDeprecated', () => {
    it('should log a deprecation warning if API key is being used for access via a web browser', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey xxxx' },
      });

      const mockAuthc = authenticationServiceMock.createStart();

      mockAuthc.getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_provider: { type: 'http', name: '__http__' },
        })
      );

      routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(
        1
      );
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
        authenticationProviderType: 'http',
        authenticationRealmType: 'native',
        httpAuthenticationScheme: 'ApiKey',
      });
      expect(routeParamsMock.logger.warn).toHaveBeenCalledTimes(1);
      expect(routeParamsMock.logger.warn).toBeCalledWith(
        'API keys are intended for programmatic access. Do not use API keys to authenticate access via a web browser.',
        { tags: ['deprecation'] }
      );
    });

    it('should not log a deprecation warning if other http auth scheme is being used for access via a web browser', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Basic' },
      });

      const mockAuthc = authenticationServiceMock.createStart();

      mockAuthc.getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_provider: { type: 'http', name: '__http__' },
        })
      );

      routeParamsMock.getAuthenticationService.mockReturnValue(mockAuthc);

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledTimes(
        1
      );
      expect(routeParamsMock.analyticsService.reportAuthenticationTypeEvent).toHaveBeenCalledWith({
        authenticationProviderType: 'http',
        authenticationRealmType: 'native',
        httpAuthenticationScheme: 'Basic',
      });
      expect(routeParamsMock.logger.warn).toHaveBeenCalledTimes(0);
    });
  });
});
