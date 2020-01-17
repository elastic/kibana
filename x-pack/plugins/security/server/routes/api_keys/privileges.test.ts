/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { LICENSE_CHECK_STATE, LicenseCheck } from '../../../../licensing/server';
import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineCheckPrivilegesRoutes } from './privileges';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  hasPrivilegesImpl?: () => Promise<unknown>;
  areAPIKeysEnabledImpl?: () => Promise<boolean>;
  asserts: {
    statusCode: number;
    result?: Record<string, any>;
  };
}

describe('Check API keys privileges', () => {
  const getPrivilegesTest = (
    description: string,
    {
      licenseCheckResult = { state: LICENSE_CHECK_STATE.Valid },
      hasPrivilegesImpl,
      areAPIKeysEnabledImpl,
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
      if (hasPrivilegesImpl) {
        mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(hasPrivilegesImpl);
      }
      if (areAPIKeysEnabledImpl) {
        mockRouteDefinitionParams.authc.areAPIKeysEnabled.mockImplementationOnce(
          areAPIKeysEnabledImpl
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
      const mockContext = ({
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
      } as unknown) as RequestHandlerContext;

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
      if (hasPrivilegesImpl) {
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.hasPrivileges',
          {
            body: { cluster: ['manage_security', 'manage_api_key'] },
          }
        );
      } else {
        expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
      }
      if (areAPIKeysEnabledImpl) {
        expect(mockRouteDefinitionParams.authc.areAPIKeysEnabled).toHaveBeenCalled();
      } else {
        expect(mockRouteDefinitionParams.authc.areAPIKeysEnabled).not.toHaveBeenCalled();
      }
    });
  };

  describe('failure', () => {
    getPrivilegesTest('returns result of license checker', {
      licenseCheckResult: { state: LICENSE_CHECK_STATE.Invalid, message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getPrivilegesTest('returns error from hasPrivilegesImpl', {
      hasPrivilegesImpl: async () => {
        throw error;
      },
      areAPIKeysEnabledImpl: async () => true,
      asserts: {
        statusCode: 406,
        result: error,
      },
    });

    getPrivilegesTest('returns error from areAPIKeysEnabled', {
      hasPrivilegesImpl: async () => ({
        cluster: {
          manage_security: true,
          manage_api_key: true,
        },
      }),
      areAPIKeysEnabledImpl: async () => {
        throw error;
      },
      asserts: {
        statusCode: 406,
        result: error,
      },
    });
  });

  describe('success', () => {
    getPrivilegesTest('returns areApiKeysEnabled and isAdmin', {
      hasPrivilegesImpl: async () => ({
        cluster: {
          manage_security: true,
          manage_api_key: true,
        },
      }),
      areAPIKeysEnabledImpl: async () => true,
      asserts: {
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: true },
      },
    });

    getPrivilegesTest(
      'returns areApiKeysEnabled=false when authc.areAPIKeysEnabled returns false"',
      {
        hasPrivilegesImpl: async () => ({
          cluster: {
            manage_security: true,
            manage_api_key: true,
          },
        }),
        areAPIKeysEnabledImpl: async () => false,
        asserts: {
          statusCode: 200,
          result: { areApiKeysEnabled: false, isAdmin: true },
        },
      }
    );

    getPrivilegesTest('returns isAdmin=false when user has insufficient privileges', {
      hasPrivilegesImpl: async () => ({
        cluster: {
          manage_security: false,
          manage_api_key: false,
        },
      }),
      areAPIKeysEnabledImpl: async () => true,
      asserts: {
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: false },
      },
    });
  });
});
