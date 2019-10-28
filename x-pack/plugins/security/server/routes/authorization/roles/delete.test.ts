/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { RequestHandlerContext } from '../../../../../../../src/core/server';
import { ILicenseCheck } from '../../../../../licensing/server';
import { LICENSE_STATUS } from '../../../../../licensing/server/constants';
import { defineDeleteRolesRoutes } from './delete';

import {
  elasticsearchServiceMock,
  httpServerMock,
} from '../../../../../../../src/core/server/mocks';
import { routeDefinitionParamsMock } from '../../index.mock';

interface TestOptions {
  licenseCheckResult?: ILicenseCheck;
  name: string;
  apiResponse?: () => Promise<unknown>;
  asserts: { statusCode: 204 | 403 | 404; result?: Record<string, any> };
}

describe('DELETE role', () => {
  const deleteRoleTest = (
    description: string,
    {
      name,
      licenseCheckResult = { check: LICENSE_STATUS.Valid },
      apiResponse,
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
      if (apiResponse) {
        mockScopedClusterClient.callAsCurrentUser.mockImplementation(apiResponse);
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
      const mockContext = ({
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
      } as unknown) as RequestHandlerContext;

      const mockResponseResult = { status: asserts.statusCode, options: {} };
      const mockResponse = httpServerMock.createResponseFactory();
      let mockResponseFactory;
      if (asserts.statusCode === 204) {
        mockResponseFactory = mockResponse.noContent;
      } else if (asserts.statusCode === 403) {
        mockResponseFactory = mockResponse.forbidden;
      } else {
        mockResponseFactory = mockResponse.customError;
      }
      mockResponseFactory.mockReturnValue(mockResponseResult);

      const response = await handler(mockContext, mockRequest, mockResponse);

      expect(response).toBe(mockResponseResult);
      expect(mockResponseFactory).toHaveBeenCalledTimes(1);
      if (asserts.result !== undefined) {
        expect(mockResponseFactory).toHaveBeenCalledWith(asserts.result);
      }

      if (apiResponse) {
        expect(mockRouteDefinitionParams.clusterClient.asScoped).toHaveBeenCalledWith(mockRequest);
        expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(
          'shield.deleteRole',
          { name }
        );
      } else {
        expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
      }
      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    deleteRoleTest(`returns result of license checker`, {
      name: 'foo-role',
      licenseCheckResult: { check: LICENSE_STATUS.Invalid, message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { body: { message: 'test forbidden message' } } },
    });

    const error = Boom.notFound('test not found message');
    deleteRoleTest(`returns error from cluster client`, {
      name: 'foo-role',
      apiResponse: () => Promise.reject(error),
      asserts: { statusCode: 404, result: { body: error, statusCode: 404 } },
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
