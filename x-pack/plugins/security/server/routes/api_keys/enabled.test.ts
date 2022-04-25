/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineEnabledApiKeysRoutes } from './enabled';

describe('API keys enabled', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return coreMock.createCustomRequestHandlerContext({
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineEnabledApiKeysRoutes(mockRouteDefinitionParams);

    const [, apiKeyRouteHandler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) => path === '/internal/security/api_key/_enabled'
    )!;
    routeHandler = apiKeyRouteHandler;
  });

  describe('failure', () => {
    test('returns result of license checker', async () => {
      const mockContext = getMockContext({ state: 'invalid', message: 'test forbidden message' });
      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });
      expect((await mockContext.licensing).license.check).toHaveBeenCalledWith('security', 'basic');
    });

    test('returns error from cluster client', async () => {
      const error = Boom.notAcceptable('test not acceptable message');
      authc.apiKeys.areAPIKeysEnabled.mockRejectedValue(error);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(406);
      expect(response.payload).toEqual(error);
    });
  });

  describe('success', () => {
    test('returns true if API Keys are enabled', async () => {
      authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(true);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ apiKeysEnabled: true });
    });

    test('returns false if API Keys are disabled', async () => {
      authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(false);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ apiKeysEnabled: false });
    });
  });
});
