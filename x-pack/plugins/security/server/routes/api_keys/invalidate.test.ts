/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { Type } from '@kbn/config-schema';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { routeDefinitionParamsMock } from '../index.mock';
import { defineInvalidateApiKeysRoutes } from './invalidate';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  apiResponses?: Array<() => Promise<unknown>>;
  payload?: Record<string, any>;
  asserts: { statusCode: number; result?: Record<string, any>; apiArguments?: unknown[] };
}

describe('Invalidate API keys', () => {
  const postInvalidateTest = (
    description: string,
    { licenseCheckResult = { state: 'valid' }, apiResponses = [], asserts, payload }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = {
        core: coreMock.createRequestHandlerContext(),
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } } as any,
      };

      for (const apiResponse of apiResponses) {
        mockContext.core.elasticsearch.client.asCurrentUser.security.invalidateApiKey.mockImplementationOnce(
          (async () => ({ body: await apiResponse() })) as any
        );
      }

      defineInvalidateApiKeysRoutes(mockRouteDefinitionParams);
      const [[{ validate }, handler]] = mockRouteDefinitionParams.router.post.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/internal/security/api_key/invalidate',
        body: payload !== undefined ? (validate as any).body.validate(payload) : undefined,
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (Array.isArray(asserts.apiArguments)) {
        for (const apiArguments of asserts.apiArguments) {
          expect(
            mockContext.core.elasticsearch.client.asCurrentUser.security.invalidateApiKey
          ).toHaveBeenCalledWith(apiArguments);
        }
      }
      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('request validation', () => {
    let requestBodySchema: Type<any>;
    beforeEach(() => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      defineInvalidateApiKeysRoutes(mockRouteDefinitionParams);

      const [[{ validate }]] = mockRouteDefinitionParams.router.post.mock.calls;
      requestBodySchema = (validate as any).body;
    });

    test('requires both isAdmin and apiKeys parameters', () => {
      expect(() =>
        requestBodySchema.validate({}, {}, 'request body')
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request body.apiKeys]: expected value of type [array] but got [undefined]"`
      );

      expect(() =>
        requestBodySchema.validate({ apiKeys: [] }, {}, 'request body')
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request body.isAdmin]: expected value of type [boolean] but got [undefined]"`
      );

      expect(() =>
        requestBodySchema.validate({ apiKeys: {}, isAdmin: true }, {}, 'request body')
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request body.apiKeys]: expected value of type [array] but got [Object]"`
      );

      expect(() =>
        requestBodySchema.validate(
          {
            apiKeys: [{ id: 'some-id', name: 'some-name', unknown: 'some-unknown' }],
            isAdmin: true,
          },
          {},
          'request body'
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[request body.apiKeys.0.unknown]: definition for this key is missing"`
      );
    });
  });

  describe('failure', () => {
    postInvalidateTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      payload: { apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }], isAdmin: true },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    postInvalidateTest('returns error from cluster client', {
      apiResponses: [
        async () => {
          throw error;
        },
      ],
      payload: {
        apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }],
        isAdmin: true,
      },
      asserts: {
        apiArguments: [{ body: { ids: ['si8If24B1bKsmSLTAhJV'] } }],
        statusCode: 200,
        result: {
          itemsInvalidated: [],
          errors: [
            {
              id: 'si8If24B1bKsmSLTAhJV',
              name: 'my-api-key',
              error: Boom.notAcceptable('test not acceptable message'),
            },
          ],
        },
      },
    });
  });

  describe('success', () => {
    postInvalidateTest('invalidates API keys', {
      apiResponses: [async () => null],
      payload: {
        apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }],
        isAdmin: true,
      },
      asserts: {
        apiArguments: [{ body: { ids: ['si8If24B1bKsmSLTAhJV'] } }],
        statusCode: 200,
        result: {
          itemsInvalidated: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }],
          errors: [],
        },
      },
    });

    postInvalidateTest('adds "owner" to body if isAdmin=false', {
      apiResponses: [async () => null],
      payload: {
        apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }],
        isAdmin: false,
      },
      asserts: {
        apiArguments: [{ body: { ids: ['si8If24B1bKsmSLTAhJV'], owner: true } }],
        statusCode: 200,
        result: {
          itemsInvalidated: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }],
          errors: [],
        },
      },
    });

    postInvalidateTest('returns only successful invalidation requests', {
      apiResponses: [
        async () => null,
        async () => {
          throw Boom.notAcceptable('test not acceptable message');
        },
      ],
      payload: {
        apiKeys: [
          { id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key1' },
          { id: 'ab8If24B1bKsmSLTAhNC', name: 'my-api-key2' },
        ],
        isAdmin: true,
      },
      asserts: {
        apiArguments: [
          { body: { ids: ['si8If24B1bKsmSLTAhJV'] } },
          { body: { ids: ['ab8If24B1bKsmSLTAhNC'] } },
        ],
        statusCode: 200,
        result: {
          itemsInvalidated: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key1' }],
          errors: [
            {
              id: 'ab8If24B1bKsmSLTAhNC',
              name: 'my-api-key2',
              error: Boom.notAcceptable('test not acceptable message'),
            },
          ],
        },
      },
    });
  });
});
