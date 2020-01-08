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
  apiResponses?: Array<() => Promise<unknown>>;
  asserts: { statusCode: number; result?: Record<string, any>; apiArguments?: unknown[][] };
}

describe('Check API keys privileges', () => {
  const getPrivilegesTest = (
    description: string,
    {
      licenseCheckResult = { state: LICENSE_CHECK_STATE.Valid },
      apiResponses = [],
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
      for (const apiResponse of apiResponses) {
        mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(apiResponse);
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

      if (Array.isArray(asserts.apiArguments)) {
        for (const apiArguments of asserts.apiArguments) {
          expect(mockRouteDefinitionParams.clusterClient.asScoped).toHaveBeenCalledWith(
            mockRequest
          );
          expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(...apiArguments);
        }
      } else {
        expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
      }
      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    getPrivilegesTest('returns result of license checker', {
      licenseCheckResult: { state: LICENSE_CHECK_STATE.Invalid, message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getPrivilegesTest('returns error from cluster client', {
      apiResponses: [
        async () => {
          throw error;
        },
        async () => {},
      ],
      asserts: {
        apiArguments: [
          ['shield.hasPrivileges', { body: { cluster: ['manage_security', 'manage_api_key'] } }],
          ['shield.getAPIKeys', { owner: true }],
        ],
        statusCode: 406,
        result: error,
      },
    });
  });

  describe('success', () => {
    getPrivilegesTest('returns areApiKeysEnabled and isAdmin', {
      apiResponses: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: true, manage_security: true },
          index: {},
          application: {},
        }),
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
        apiArguments: [
          ['shield.getAPIKeys', { owner: true }],
          ['shield.hasPrivileges', { body: { cluster: ['manage_security', 'manage_api_key'] } }],
        ],
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: true },
      },
    });

    getPrivilegesTest(
      'returns areApiKeysEnabled=false when getAPIKeys error message includes "api keys are not enabled"',
      {
        apiResponses: [
          async () => ({
            username: 'elastic',
            has_all_requested: true,
            cluster: { manage_api_key: true, manage_security: true },
            index: {},
            application: {},
          }),
          async () => {
            throw Boom.unauthorized('api keys are not enabled');
          },
        ],
        asserts: {
          apiArguments: [
            ['shield.getAPIKeys', { owner: true }],
            ['shield.hasPrivileges', { body: { cluster: ['manage_security', 'manage_api_key'] } }],
          ],
          statusCode: 200,
          result: { areApiKeysEnabled: false, isAdmin: true },
        },
      }
    );

    getPrivilegesTest('returns isAdmin=false when user has insufficient privileges', {
      apiResponses: [
        async () => ({
          username: 'elastic',
          has_all_requested: true,
          cluster: { manage_api_key: false, manage_security: false },
          index: {},
          application: {},
        }),
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
        apiArguments: [
          ['shield.getAPIKeys', { owner: true }],
          ['shield.hasPrivileges', { body: { cluster: ['manage_security', 'manage_api_key'] } }],
        ],
        statusCode: 200,
        result: { areApiKeysEnabled: true, isAdmin: false },
      },
    });
  });
});
