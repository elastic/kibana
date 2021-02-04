/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '../../../../../../src/core/server';
import { LicenseCheck } from '../../../../licensing/server';
import { defineGetApiKeysRoutes } from './get';

import { httpServerMock, coreMock } from '../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../index.mock';
import Boom from '@hapi/boom';

interface TestOptions {
  isAdmin?: boolean;
  licenseCheckResult?: LicenseCheck;
  apiResponse?: () => Promise<unknown>;
  asserts: { statusCode: number; result?: Record<string, any> };
}

describe('Get API keys', () => {
  const getApiKeysTest = (
    description: string,
    { licenseCheckResult = { state: 'valid' }, apiResponse, asserts, isAdmin = true }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = {
        core: coreMock.createRequestHandlerContext(),
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } } as any,
      };

      if (apiResponse) {
        mockContext.core.elasticsearch.client.asCurrentUser.security.getApiKey.mockImplementation(
          (async () => ({ body: await apiResponse() })) as any
        );
      }

      defineGetApiKeysRoutes(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: '/internal/security/api_key',
        query: { isAdmin: isAdmin.toString() },
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (apiResponse) {
        expect(
          mockContext.core.elasticsearch.client.asCurrentUser.security.getApiKey
        ).toHaveBeenCalledWith({ owner: !isAdmin });
      }
      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    getApiKeysTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getApiKeysTest('returns error from cluster client', {
      apiResponse: async () => {
        throw error;
      },
      asserts: { statusCode: 406, result: error },
    });
  });

  describe('success', () => {
    getApiKeysTest('returns API keys', {
      apiResponse: async () => ({
        api_keys: [
          {
            id: 'YCLV7m0BJ3xI4hhWB648',
            name: 'test-api-key',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: false,
            username: 'elastic',
            realm: 'reserved',
          },
        ],
      }),
      asserts: {
        statusCode: 200,
        result: {
          apiKeys: [
            {
              id: 'YCLV7m0BJ3xI4hhWB648',
              name: 'test-api-key',
              creation: 1571670001452,
              expiration: 1571756401452,
              invalidated: false,
              username: 'elastic',
              realm: 'reserved',
            },
          ],
        },
      },
    });
    getApiKeysTest('returns only valid API keys', {
      apiResponse: async () => ({
        api_keys: [
          {
            id: 'YCLV7m0BJ3xI4hhWB648',
            name: 'test-api-key1',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: true,
            username: 'elastic',
            realm: 'reserved',
          },
          {
            id: 'YCLV7m0BJ3xI4hhWB648',
            name: 'test-api-key2',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: false,
            username: 'elastic',
            realm: 'reserved',
          },
        ],
      }),
      asserts: {
        statusCode: 200,
        result: {
          apiKeys: [
            {
              id: 'YCLV7m0BJ3xI4hhWB648',
              name: 'test-api-key2',
              creation: 1571670001452,
              expiration: 1571756401452,
              invalidated: false,
              username: 'elastic',
              realm: 'reserved',
            },
          ],
        },
      },
    });
  });
});
