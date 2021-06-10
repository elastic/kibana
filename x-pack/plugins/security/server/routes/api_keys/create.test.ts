/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type { RequestHandler } from 'src/core/server';
import { kibanaResponseFactory } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import type { AuthenticationServiceStartInternal } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import type { SecurityRequestHandlerContext } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineCreateApiKeyRoutes } from './create';

describe('Create API Key route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return ({
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    } as unknown) as SecurityRequestHandlerContext;
  }

  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<AuthenticationServiceStartInternal>;
  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineCreateApiKeyRoutes(mockRouteDefinitionParams);

    const [, apiKeyRouteHandler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/api_key'
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
      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });

    test('returns error from cluster client', async () => {
      const error = Boom.notAcceptable('test not acceptable message');
      authc.apiKeys.create.mockRejectedValue(error);

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
    test('allows an API Key to be created', async () => {
      authc.apiKeys.create.mockResolvedValue({
        api_key: 'abc123',
        id: 'key_id',
        name: 'my api key',
      });

      const payload = {
        name: 'my api key',
        expires: '12d',
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
      expect(authc.apiKeys.create).toHaveBeenCalledWith(request, payload);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        api_key: 'abc123',
        id: 'key_id',
        name: 'my api key',
      });
    });

    test('returns a message if API Keys are disabled', async () => {
      authc.apiKeys.create.mockResolvedValue(null);

      const payload = {
        name: 'my api key',
        expires: '12d',
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
      expect(authc.apiKeys.create).toHaveBeenCalledWith(request, payload);

      expect(response.status).toBe(400);
      expect(response.payload).toEqual({
        message: 'API Keys are not available',
      });
    });
  });
});
