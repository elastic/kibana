/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { LicenseCheck } from '../../../../licensing/server';
import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineCheckPrivilegesRoutes } from './privileges';
import { APIKeys } from '../../authentication/api_keys';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  callAsInternalUserResponses?: Array<() => Promise<unknown>>;
  callAsCurrentUserResponses?: Array<() => Promise<unknown>>;
  asserts: {
    statusCode: number;
    result?: Record<string, any>;
    callAsInternalUserAPIArguments?: unknown[][];
    callAsCurrentUserAPIArguments?: unknown[][];
  };
}

describe('Check API keys privileges', () => {
  const getPrivilegesTest = (
    description: string,
    {
      licenseCheckResult = { state: 'valid' },
      callAsInternalUserResponses = [],
      callAsCurrentUserResponses = [],
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

      const apiKeys = new APIKeys({
        logger: mockRouteDefinitionParams.logger,
        clusterClient: mockRouteDefinitionParams.clusterClient,
        license: mockRouteDefinitionParams.license,
      });

      mockRouteDefinitionParams.authc.areAPIKeysEnabled.mockImplementation(() =>
        apiKeys.areAPIKeysEnabled()
      );

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
      for (const apiResponse of callAsCurrentUserResponses) {
        mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(apiResponse);
      }
      for (const apiResponse of callAsInternalUserResponses) {
        mockRouteDefinitionParams.clusterClient.callAsInternalUser.mockImplementationOnce(
          apiResponse
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

      if (Array.isArray(asserts.callAsCurrentUserAPIArguments)) {
        for (const apiArguments of asserts.callAsCurrentUserAPIArguments) {
          expect(mockRouteDefinitionParams.clusterClient.asScoped).toHaveBeenCalledWith(
            mockRequest
          );
          expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(...apiArguments);
        }
      } else {
        expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
      }

      if (Array.isArray(asserts.callAsInternalUserAPIArguments)) {
        for (const apiArguments of asserts.callAsInternalUserAPIArguments) {
          expect(mockRouteDefinitionParams.clusterClient.callAsInternalUser).toHaveBeenCalledWith(
            ...apiArguments
          );
        }
      } else {
        expect(mockRouteDefinitionParams.clusterClient.callAsInternalUser).not.toHaveBeenCalled();
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
      callAsCurrentUserResponses: [
        async () => {
          throw error;
        },
      ],
      callAsInternalUserResponses: [async () => {}],
      asserts: {
        callAsCurrentUserAPIArguments: [
          [
            'shield.hasPrivileges',
            { body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] } },
          ],
        ],
        callAsInternalUserAPIArguments: [
          ['shield.invalidateAPIKey', { body: { id: expect.any(String) } }],
        ],
        statusCode: 406,
        result: error,
      },
    });
  });

  describe('success', () => {
    getPrivilegesTest('returns areApiKeysEnabled and isAdmin', {
      callAsCurrentUserResponses: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: true, manage_security: true, manage_own_api_key: false },
          index: {},
          application: {},
        }),
      ],
      callAsInternalUserResponses: [
        async () => ({
          api_keys: [
            {
              id: 'si8If24B1bKsmSLTAhJV',
              name: 'my-api-key',
              creation: 1574089261632,
              expiration: 1574175661632,
              invalidated: false,
              username: 'elastic',
              realm: 'reserved',
            },
          ],
        }),
      ],
      asserts: {
        callAsCurrentUserAPIArguments: [
          [
            'shield.hasPrivileges',
            { body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] } },
          ],
        ],
        callAsInternalUserAPIArguments: [
          ['shield.invalidateAPIKey', { body: { id: expect.any(String) } }],
        ],
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: true, canManage: true },
      },
    });

    getPrivilegesTest(
      'returns areApiKeysEnabled=false when API Keys are disabled in Elasticsearch',
      {
        callAsCurrentUserResponses: [
          async () => ({
            username: 'elastic',
            has_all_requested: true,
            cluster: { manage_api_key: true, manage_security: true, manage_own_api_key: true },
            index: {},
            application: {},
          }),
        ],
        callAsInternalUserResponses: [
          async () => {
            const error = new Error();
            (error as any).body = {
              error: {
                'disabled.feature': 'api_keys',
              },
            };
            throw error;
          },
        ],
        asserts: {
          callAsCurrentUserAPIArguments: [
            [
              'shield.hasPrivileges',
              { body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] } },
            ],
          ],
          callAsInternalUserAPIArguments: [
            ['shield.invalidateAPIKey', { body: { id: expect.any(String) } }],
          ],
          statusCode: 200,
          result: { areApiKeysEnabled: false, isAdmin: true, canManage: true },
        },
      }
    );

    getPrivilegesTest('returns isAdmin=false when user has insufficient privileges', {
      callAsCurrentUserResponses: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: false, manage_security: false, manage_own_api_key: false },
          index: {},
          application: {},
        }),
      ],
      callAsInternalUserResponses: [async () => ({})],
      asserts: {
        callAsCurrentUserAPIArguments: [
          [
            'shield.hasPrivileges',
            { body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] } },
          ],
        ],
        callAsInternalUserAPIArguments: [
          ['shield.invalidateAPIKey', { body: { id: expect.any(String) } }],
        ],
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: false, canManage: false },
      },
    });

    getPrivilegesTest('returns canManage=true when user can manage their own API Keys', {
      callAsCurrentUserResponses: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: false, manage_security: false, manage_own_api_key: true },
          index: {},
          application: {},
        }),
      ],
      callAsInternalUserResponses: [async () => ({})],
      asserts: {
        callAsCurrentUserAPIArguments: [
          [
            'shield.hasPrivileges',
            { body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] } },
          ],
        ],
        callAsInternalUserAPIArguments: [
          ['shield.invalidateAPIKey', { body: { id: expect.any(String) } }],
        ],
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: false, canManage: true },
      },
    });
  });
});
