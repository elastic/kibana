/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routeDefinitionParamsMock } from '../index.mock';
import { elasticsearchServiceMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { LICENSE_CHECK_STATE } from '../../../../licensing/server';
import { defineRoleMappingDeleteRoutes } from './delete';

describe('DELETE role mappings', () => {
  it('allows a role mapping to be deleted', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

    const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
    mockScopedClusterClient.callAsCurrentUser.mockResolvedValue({ acknowledged: true });

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
    const mockContext = ({
      licensing: {
        license: { check: jest.fn().mockReturnValue({ state: LICENSE_CHECK_STATE.Valid }) },
      },
    } as unknown) as RequestHandlerContext;

    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ acknowledged: true });
    expect(mockRouteDefinitionParams.clusterClient.asScoped).toHaveBeenCalledWith(mockRequest);
    expect(
      mockScopedClusterClient.callAsCurrentUser
    ).toHaveBeenCalledWith('shield.deleteRoleMapping', { name });
  });

  describe('failure', () => {
    it('returns result of license check', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

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
      const mockContext = ({
        licensing: {
          license: {
            check: jest.fn().mockReturnValue({
              state: LICENSE_CHECK_STATE.Invalid,
              message: 'test forbidden message',
            }),
          },
        },
      } as unknown) as RequestHandlerContext;

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });
      expect(mockRouteDefinitionParams.clusterClient.asScoped).not.toHaveBeenCalled();
    });
  });
});
