/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory } from 'src/core/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';

import type { LicenseCheck } from '../../../../licensing/server';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineCheckPrivilegesRoutes } from './privileges';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  areAPIKeysEnabled?: boolean;
  apiResponse?: () => unknown;
  asserts: { statusCode: number; result?: Record<string, any>; apiArguments?: unknown };
}

describe('Check API keys privileges', () => {
  const getPrivilegesTest = (
    description: string,
    {
      licenseCheckResult = { state: 'valid' },
      areAPIKeysEnabled = true,
      apiResponse,
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockCoreContext = coreMock.createRequestHandlerContext();
      const mockLicensingContext = {
        license: { check: jest.fn().mockReturnValue(licenseCheckResult) },
      } as any;
      const mockContext = coreMock.createCustomRequestHandlerContext({
        core: mockCoreContext,
        licensing: mockLicensingContext,
      });

      const authc = authenticationServiceMock.createStart();
      authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(areAPIKeysEnabled);
      mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

      if (apiResponse) {
        mockCoreContext.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockResponseImplementation(
          // @ts-expect-error unknown return
          () => {
            return {
              body: apiResponse(),
            };
          }
        );
      }

      defineCheckPrivilegesRoutes(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: '/internal/security/api_key/privileges',
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (asserts.apiArguments) {
        expect(
          mockCoreContext.elasticsearch.client.asCurrentUser.security.hasPrivileges
        ).toHaveBeenCalledWith(asserts.apiArguments);
      }

      expect(mockLicensingContext.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    getPrivilegesTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getPrivilegesTest('returns error from cluster client', {
      apiResponse: () => {
        throw error;
      },
      asserts: {
        apiArguments: {
          body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] },
        },
        statusCode: 406,
        result: error,
      },
    });
  });

  describe('success', () => {
    getPrivilegesTest('returns areApiKeysEnabled and isAdmin', {
      apiResponse: () => ({
        username: 'elastic',
        has_all_requested: true,
        cluster: { manage_api_key: true, manage_security: true, manage_own_api_key: false },
        index: {},
        application: {},
      }),
      asserts: {
        apiArguments: {
          body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] },
        },
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: true, canManage: true },
      },
    });

    getPrivilegesTest(
      'returns areApiKeysEnabled=false when API Keys are disabled in Elasticsearch',
      {
        apiResponse: () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: true, manage_security: true, manage_own_api_key: true },
          index: {},
          application: {},
        }),
        areAPIKeysEnabled: false,
        asserts: {
          apiArguments: {
            body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] },
          },
          statusCode: 200,
          result: { areApiKeysEnabled: false, isAdmin: true, canManage: true },
        },
      }
    );

    getPrivilegesTest('returns isAdmin=false when user has insufficient privileges', {
      apiResponse: () => ({
        username: 'elastic',
        has_all_requested: true,
        cluster: { manage_api_key: false, manage_security: false, manage_own_api_key: false },
        index: {},
        application: {},
      }),
      asserts: {
        apiArguments: {
          body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] },
        },
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: false, canManage: false },
      },
    });

    getPrivilegesTest('returns canManage=true when user can manage their own API Keys', {
      apiResponse: () => ({
        username: 'elastic',
        has_all_requested: true,
        cluster: { manage_api_key: false, manage_security: false, manage_own_api_key: true },
        index: {},
        application: {},
      }),
      asserts: {
        apiArguments: {
          body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] },
        },
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: false, canManage: true },
      },
    });
  });
});
