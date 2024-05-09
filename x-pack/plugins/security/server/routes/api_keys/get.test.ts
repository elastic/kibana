/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import { kibanaResponseFactory } from '@kbn/core/server';
import type { RequestHandler } from '@kbn/core/server';
import type { CustomRequestHandlerMock, ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineGetApiKeysRoutes } from './get';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Get API Keys route', () => {
  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let esClientMock: ScopedClusterClientMock;
  let mockContext: CustomRequestHandlerMock<unknown>;

  beforeEach(async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    authc = authenticationServiceMock.createStart();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);
    defineGetApiKeysRoutes(mockRouteDefinitionParams);
    [[, routeHandler]] = mockRouteDefinitionParams.router.get.mock.calls;
    mockContext = coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: licensingMock.createRequestHandlerContext(),
    });

    esClientMock = (await mockContext.core).elasticsearch.client;

    authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(true);
    authc.apiKeys.areCrossClusterAPIKeysEnabled.mockResolvedValue(true);

    esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
      cluster: {
        manage_security: true,
        read_security: true,
        manage_api_key: true,
        manage_own_api_key: true,
      },
    } as any);

    esClientMock.asCurrentUser.security.getApiKey.mockResponse({
      api_keys: [
        { id: '123', invalidated: false },
        { id: '456', invalidated: true },
      ],
    } as any);
  });

  it('should filter out invalidated API keys', async () => {
    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.apiKeys).toContainEqual({ id: '123', name: '123', invalidated: false });
    expect(response.payload.apiKeys).not.toContainEqual({
      id: '456',
      name: '456',
      invalidated: true,
    });
  });

  it('should substitute the API key id for keys with `null` names', async () => {
    esClientMock.asCurrentUser.security.getApiKey.mockRestore();
    esClientMock.asCurrentUser.security.getApiKey.mockResponse({
      api_keys: [
        { id: 'with_name', name: 'foo', invalidated: false },
        { id: 'undefined_name', invalidated: false },
        { id: 'null_name', name: null, invalidated: false },
      ],
    } as any);

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.apiKeys).toEqual([
      {
        id: 'with_name',
        name: 'foo',
        invalidated: false,
      },
      {
        id: 'undefined_name',
        name: 'undefined_name',
        invalidated: false,
      },
      {
        id: 'null_name',
        name: 'null_name',
        invalidated: false,
      },
    ]);
  });

  it('should return `404` if API keys are disabled', async () => {
    authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(false);

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message:
        "API keys are disabled in Elasticsearch. To use API keys enable 'xpack.security.authc.api_key.enabled' setting.",
    });
  });

  it('should forward error from Elasticsearch GET API keys endpoint', async () => {
    const error = Boom.forbidden('test not acceptable message');
    esClientMock.asCurrentUser.security.getApiKey.mockResponseImplementation(() => {
      throw error;
    });

    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(403);
    expect(response.payload).toEqual(error);
  });

  describe('when user has `manage_security` permission', () => {
    beforeEach(() => {
      esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
        cluster: {
          manage_security: true,
          read_security: true,
          manage_api_key: true,
          manage_own_api_key: true,
        },
      } as any);
    });

    it('should calculate user privileges correctly', async () => {
      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.payload).toEqual(
        expect.objectContaining({
          canManageCrossClusterApiKeys: true,
          canManageApiKeys: true,
          canManageOwnApiKeys: true,
        })
      );
    });

    it('should disable `canManageCrossClusterApiKeys` when not supported by Elasticsearch', async () => {
      authc.apiKeys.areCrossClusterAPIKeysEnabled.mockResolvedValue(false);

      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.payload).toEqual(
        expect.objectContaining({
          canManageCrossClusterApiKeys: false,
          canManageApiKeys: true,
          canManageOwnApiKeys: true,
        })
      );
    });

    it('should request list of all Elasticsearch API keys', async () => {
      await routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

      expect(esClientMock.asCurrentUser.security.getApiKey).toHaveBeenCalledWith({ owner: false });
    });
  });

  describe('when user has `manage_api_key` permission', () => {
    beforeEach(() => {
      esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
        cluster: {
          manage_security: false,
          read_security: false,
          manage_api_key: true,
          manage_own_api_key: true,
        },
      } as any);
    });

    it('should calculate user privileges correctly ', async () => {
      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.payload).toEqual(
        expect.objectContaining({
          canManageCrossClusterApiKeys: false,
          canManageApiKeys: true,
          canManageOwnApiKeys: true,
        })
      );
    });

    it('should request list of all Elasticsearch API keys', async () => {
      await routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

      expect(esClientMock.asCurrentUser.security.getApiKey).toHaveBeenCalledWith({ owner: false });
    });
  });

  describe('when user has `read_security` permission', () => {
    beforeEach(() => {
      esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
        cluster: {
          manage_security: false,
          read_security: true,
          manage_api_key: false,
          manage_own_api_key: false,
        },
      } as any);
    });

    it('should calculate user privileges correctly ', async () => {
      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.payload).toEqual(
        expect.objectContaining({
          canManageCrossClusterApiKeys: false,
          canManageApiKeys: false,
          canManageOwnApiKeys: false,
        })
      );
    });

    it('should request list of all Elasticsearch API keys', async () => {
      await routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

      expect(esClientMock.asCurrentUser.security.getApiKey).toHaveBeenCalledWith({ owner: false });
    });
  });

  describe('when user has `manage_own_api_key` permission', () => {
    beforeEach(() => {
      esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
        cluster: {
          manage_security: false,
          read_security: false,
          manage_api_key: false,
          manage_own_api_key: true,
        },
      } as any);
    });

    it('should calculate user privileges correctly ', async () => {
      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.payload).toEqual(
        expect.objectContaining({
          canManageCrossClusterApiKeys: false,
          canManageApiKeys: false,
          canManageOwnApiKeys: true,
        })
      );
    });

    it('should only request list of API keys owned by the user', async () => {
      await routeHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

      expect(esClientMock.asCurrentUser.security.getApiKey).toHaveBeenCalledWith({ owner: true });
    });
  });
});
