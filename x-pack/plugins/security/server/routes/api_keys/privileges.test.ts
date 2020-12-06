/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { LicenseCheck } from '../../../../licensing/server';
import { kibanaResponseFactory } from '../../../../../../src/core/server';

import { coreMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineCheckPrivilegesRoutes } from './privileges';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  areAPIKeysEnabled?: boolean;
  apiResponse?: () => Promise<unknown>;
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
      const mockContext = {
        core: coreMock.createRequestHandlerContext(),
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } } as any,
      };

      mockRouteDefinitionParams.authc.areAPIKeysEnabled.mockResolvedValue(areAPIKeysEnabled);

      if (apiResponse) {
        mockContext.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockImplementation(
          (async () => ({ body: await apiResponse() })) as any
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
          mockContext.core.elasticsearch.client.asCurrentUser.security.hasPrivileges
        ).toHaveBeenCalledWith(asserts.apiArguments);
      }

      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    getPrivilegesTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getPrivilegesTest('returns error from cluster client', {
      apiResponse: async () => {
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
      apiResponse: async () => ({
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
        apiResponse: async () => ({
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
      apiResponse: async () => ({
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
      apiResponse: async () => ({
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
