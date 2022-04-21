/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { routeDefinitionParamsMock } from '../../index.mock';
import { defineDeleteRolesRoutes } from './delete';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  name: string;
  apiResponse?: () => Promise<unknown>;
  asserts: { statusCode: number; result?: Record<string, any> };
}

describe('DELETE role', () => {
  const deleteRoleTest = (
    description: string,
    { name, licenseCheckResult = { state: 'valid' }, apiResponse, asserts }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = {
        core: coreMock.createRequestHandlerContext(),
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } } as any,
      };

      if (apiResponse) {
        mockContext.core.elasticsearch.client.asCurrentUser.security.deleteRole.mockImplementation(
          (async () => ({ body: await apiResponse() })) as any
        );
      }

      defineDeleteRolesRoutes(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.delete.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `/api/security/role/${name}`,
        params: { name },
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (apiResponse) {
        expect(
          mockContext.core.elasticsearch.client.asCurrentUser.security.deleteRole
        ).toHaveBeenCalledWith({ name });
      }
      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    deleteRoleTest('returns result of license checker', {
      name: 'foo-role',
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notFound('test not found message');
    deleteRoleTest('returns error from cluster client', {
      name: 'foo-role',
      apiResponse: async () => {
        throw error;
      },
      asserts: { statusCode: 404, result: error },
    });
  });

  describe('success', () => {
    deleteRoleTest(`deletes role`, {
      name: 'foo-role',
      apiResponse: async () => {},
      asserts: { statusCode: 204, result: undefined },
    });
  });
});
