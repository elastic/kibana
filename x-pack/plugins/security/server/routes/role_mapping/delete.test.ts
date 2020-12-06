/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routeDefinitionParamsMock } from '../index.mock';
import { coreMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory } from '../../../../../../src/core/server';
import { defineRoleMappingDeleteRoutes } from './delete';

describe('DELETE role mappings', () => {
  it('allows a role mapping to be deleted', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    const mockContext = {
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue({ state: 'valid' }) } } as any,
    };
    mockContext.core.elasticsearch.client.asCurrentUser.security.deleteRoleMapping.mockResolvedValue(
      { body: { acknowledged: true } } as any
    );

    defineRoleMappingDeleteRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.delete.mock.calls;

    const name = 'mapping1';
    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `/internal/security/role_mapping/${name}`,
      params: { name },
      headers,
    });

    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ acknowledged: true });
    expect(
      mockContext.core.elasticsearch.client.asCurrentUser.security.deleteRoleMapping
    ).toHaveBeenCalledWith({ name });
  });

  describe('failure', () => {
    it('returns result of license check', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = {
        core: coreMock.createRequestHandlerContext(),
        licensing: {
          license: {
            check: jest.fn().mockReturnValue({
              state: 'invalid',
              message: 'test forbidden message',
            }),
          },
        } as any,
      };

      defineRoleMappingDeleteRoutes(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.delete.mock.calls;

      const name = 'mapping1';
      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `/internal/security/role_mapping/${name}`,
        params: { name },
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });
      expect(
        mockContext.core.elasticsearch.client.asCurrentUser.security.deleteRoleMapping
      ).not.toHaveBeenCalled();
    });
  });
});
