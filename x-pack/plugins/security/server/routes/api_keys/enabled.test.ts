/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { LicenseCheck } from '../../../../licensing/server';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';
import Boom from '@hapi/boom';
import { defineEnabledApiKeysRoutes } from './enabled';
import { APIKeys } from '../../authentication/api_keys';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  apiResponse?: () => Promise<unknown>;
  asserts: { statusCode: number; result?: Record<string, any> };
}

describe('API keys enabled', () => {
  const enabledApiKeysTest = (
    description: string,
    { licenseCheckResult = { state: 'valid' }, apiResponse, asserts }: TestOptions
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

      if (apiResponse) {
        mockRouteDefinitionParams.clusterClient.callAsInternalUser.mockImplementation(apiResponse);
      }

      defineEnabledApiKeysRoutes(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: '/internal/security/api_key/_enabled',
        headers,
      });
      const mockContext = ({
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
      } as unknown) as RequestHandlerContext;

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (apiResponse) {
        expect(mockRouteDefinitionParams.clusterClient.callAsInternalUser).toHaveBeenCalledWith(
          'shield.invalidateAPIKey',
          {
            body: {
              id: expect.any(String),
            },
          }
        );
      } else {
        expect(mockRouteDefinitionParams.clusterClient.asScoped).not.toHaveBeenCalled();
      }
      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    enabledApiKeysTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    enabledApiKeysTest('returns error from cluster client', {
      apiResponse: async () => {
        throw error;
      },
      asserts: { statusCode: 406, result: error },
    });
  });

  describe('success', () => {
    enabledApiKeysTest('returns true if API Keys are enabled', {
      apiResponse: async () => ({}),
      asserts: {
        statusCode: 200,
        result: {
          apiKeysEnabled: true,
        },
      },
    });
    enabledApiKeysTest('returns false if API Keys are disabled', {
      apiResponse: async () => {
        const error = new Error();
        (error as any).body = {
          error: { 'disabled.feature': 'api_keys' },
        };
        throw error;
      },
      asserts: {
        statusCode: 200,
        result: {
          apiKeysEnabled: false,
        },
      },
    });
  });
});
