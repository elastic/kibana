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
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineUpdateApiKeyRoutes } from './update';

describe('Update API Key route', () => {
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

    defineUpdateApiKeyRoutes(mockRouteDefinitionParams);

    const [, apiKeyRouteHandler] = mockRouteDefinitionParams.router.put.mock.calls.find(
      ([{ path }]) => path === '/internal/security/api_key'
    )!;
    routeHandler = apiKeyRouteHandler;
  });

  describe('failure', () => {
    it('returns result of license checker', async () => {
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

    it('returns error from cluster client', async () => {
      const error = Boom.notAcceptable('test not acceptable message');
      authc.apiKeys.update.mockRejectedValue(error);

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
    it('allows an API Key to be updated', async () => {
      authc.apiKeys.update.mockResolvedValue({
        updated: true,
      });

      const payload = {
        id: 'test_id',
        role_descriptors: {
          role_1: {},
        },
        metadata: {
          foo: 'bar',
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: {
          ...payload,
        },
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(authc.apiKeys.update).toHaveBeenCalledWith(request, payload);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        updated: true,
      });
    });

    it('returns a message if API Keys are disabled', async () => {
      authc.apiKeys.update.mockResolvedValue(null);

      const payload = {
        id: 'test_id',
        metadata: {},
        role_descriptors: {
          role_1: {},
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: {
          ...payload,
        },
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(authc.apiKeys.update).toHaveBeenCalledWith(request, payload);
      expect(response.status).toBe(400);
      expect(response.payload).toEqual({
        message: 'API Keys are not available',
      });
    });
  });
});
