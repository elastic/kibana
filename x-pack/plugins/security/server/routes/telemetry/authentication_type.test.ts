/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type { RequestHandler } from 'src/core/server';
import { kibanaResponseFactory } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';
import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';

import type { UsageCounter } from '../../../../../../src/plugins/usage_collection/server/usage_counters/usage_counter';
import type { AuthenticatedUser } from '../../../common';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import type { SecurityRequestHandlerContext } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineTelemetryOnAuthTypeRoutes } from './authentication_type';

const FAKE_TIMESTAMP = 1637665318135;
function getMockContext(
  licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
) {
  return {
    licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
  } as unknown as SecurityRequestHandlerContext;
}

describe('Telemetry on auth type', () => {
  const mockContext = getMockContext();
  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;

  jest.useFakeTimers('modern').setSystemTime(FAKE_TIMESTAMP);

  describe('call incrementCounter', () => {
    let mockUsageCounter: UsageCounter;
    beforeEach(() => {
      const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
      mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
      authc = authenticationServiceMock.createStart();
      authc.getCurrentUser.mockImplementation(() => mockAuthenticatedUser());
      const mockRouteDefinitionParams = {
        ...routeDefinitionParamsMock.create(),
        usageCounter: mockUsageCounter,
      };
      mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);
      defineTelemetryOnAuthTypeRoutes(mockRouteDefinitionParams);

      const [, telemetryOnAuthTypeRouteHandler] =
        mockRouteDefinitionParams.router.post.mock.calls.find(
          ([{ path }]) => path === '/internal/security/telemetry/auth_type'
        )!;
      routeHandler = telemetryOnAuthTypeRouteHandler;
    });

    it('if request body is equal to null.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const response = await routeHandler(mockContext, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(response.payload).toEqual({
        auth_type: 'realm',
        timestamp: FAKE_TIMESTAMP,
        username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
      });
    });

    it('if elapsed time is above 12 hours', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          auth_type: 'realm',
          timestamp: FAKE_TIMESTAMP - 13 * 60 * 60 * 1000,
          username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
        },
      });
      const response = await routeHandler(mockContext, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(response.payload).toEqual({
        auth_type: 'realm',
        timestamp: FAKE_TIMESTAMP,
        username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
      });
    });

    it('if authType changed', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          auth_type: 'token',
          timestamp: FAKE_TIMESTAMP,
          username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
        },
      });
      const response = await routeHandler(mockContext, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(response.payload).toEqual({
        auth_type: 'realm',
        timestamp: FAKE_TIMESTAMP,
        username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
      });
    });

    it('if username changed', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          auth_type: 'token',
          timestamp: FAKE_TIMESTAMP,
          username_hash: '33c76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
        },
      });
      const response = await routeHandler(mockContext, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(response.payload).toEqual({
        auth_type: 'realm',
        timestamp: FAKE_TIMESTAMP,
        username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
      });
    });
  });

  describe('do NOT call incrementCounter', () => {
    let mockUsageCounter: UsageCounter;
    beforeEach(() => {
      const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
      mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
      authc = authenticationServiceMock.createStart();
      authc.getCurrentUser.mockImplementation(() => mockAuthenticatedUser());
      const mockRouteDefinitionParams = {
        ...routeDefinitionParamsMock.create(),
        usageCounter: mockUsageCounter,
      };
      mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);
      defineTelemetryOnAuthTypeRoutes(mockRouteDefinitionParams);

      const [, telemetryOnAuthTypeRouteHandler] =
        mockRouteDefinitionParams.router.post.mock.calls.find(
          ([{ path }]) => path === '/internal/security/telemetry/auth_type'
        )!;
      routeHandler = telemetryOnAuthTypeRouteHandler;
    });

    it('when getAuthenticationService do not return auth type', async () => {
      authc.getCurrentUser.mockImplementation(
        () =>
          ({
            ...mockAuthenticatedUser(),
            authentication_type: undefined,
          } as unknown as AuthenticatedUser)
      );
      const mockRouteDefinitionParams = {
        ...routeDefinitionParamsMock.create(),
        usageCounter: mockUsageCounter,
      };
      mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);
      defineTelemetryOnAuthTypeRoutes(mockRouteDefinitionParams);

      const [, telemetryOnAuthTypeRouteHandler] =
        mockRouteDefinitionParams.router.post.mock.calls.find(
          ([{ path }]) => path === '/internal/security/telemetry/auth_type'
        )!;
      routeHandler = telemetryOnAuthTypeRouteHandler;

      const request = httpServerMock.createKibanaRequest();
      const response = await routeHandler(mockContext, request, kibanaResponseFactory);

      expect(response.status).toBe(400);
      expect(response.payload).toEqual({ message: 'Authentication type can not be empty' });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(0);
    });

    it('if elapsed time is under 12 hours', async () => {
      const oldTimestamp = FAKE_TIMESTAMP - 10 * 60 * 60 * 1000;
      const request = httpServerMock.createKibanaRequest({
        body: {
          auth_type: 'realm',
          timestamp: oldTimestamp,
          username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
        },
      });
      const response = await routeHandler(mockContext, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(0);
      expect(response.payload).toEqual({
        auth_type: 'realm',
        timestamp: oldTimestamp,
        username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
      });
    });

    it('if authType/username did not change', async () => {
      const request = httpServerMock.createKibanaRequest({
        body: {
          auth_type: 'realm',
          timestamp: FAKE_TIMESTAMP,
          username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
        },
      });
      const response = await routeHandler(mockContext, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(0);
      expect(response.payload).toEqual({
        auth_type: 'realm',
        timestamp: FAKE_TIMESTAMP,
        username_hash: '8ac76453d769d4fd14b3f41ad4933f9bd64321972cd002de9b847e117435b08b',
      });
    });
  });
});
