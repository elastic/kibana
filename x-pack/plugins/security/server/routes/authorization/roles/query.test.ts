/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory } from '@kbn/core/server';
import type { RequestHandler } from '@kbn/core/server';
import type { CustomRequestHandlerMock, ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineQueryRolesRoutes } from './query';
import type { InternalAuthenticationServiceStart } from '../../../authentication';
import { authenticationServiceMock } from '../../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../../index.mock';

describe('Query roles', () => {
  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let esClientMock: ScopedClusterClientMock;
  let mockContext: CustomRequestHandlerMock<unknown>;

  beforeEach(async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    authc = authenticationServiceMock.createStart();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);
    defineQueryRolesRoutes(mockRouteDefinitionParams);
    [[, routeHandler]] = mockRouteDefinitionParams.router.post.mock.calls;
    mockContext = coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: licensingMock.createRequestHandlerContext(),
    });

    esClientMock = (await mockContext.core).elasticsearch.client;

    authc.apiKeys.areAPIKeysEnabled.mockResolvedValue(true);
    authc.apiKeys.areCrossClusterAPIKeysEnabled.mockResolvedValue(true);

    esClientMock.asCurrentUser.security.hasPrivileges.mockResponse({
      cluster: {
        manage_security: true,
        read_security: true,
        manage_api_key: true,
        manage_own_api_key: true,
      },
    } as any);

    esClientMock.asCurrentUser.security.queryRole.mockResponse({
      total: 2,
      count: 2,
      roles: [{ name: 'role1' }, { name: 'role2' }],
    });
  });
});
