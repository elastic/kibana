/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { routeDefinitionParamsMock, securityRequestHandlerContextMock } from '../index.mock';
import { defineAnonymousAccessGetCapabilitiesRoutes } from './get_capabilities';

describe('GET /internal/security/anonymous_access/capabilities', () => {
  it('returns anonymous access state', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAnonymousAccessService.mockReturnValue({
      isAnonymousAccessEnabled: true,
      accessURLParameters: new Map([['auth_provider_hint', 'anonymous1']]),
      getCapabilities: jest.fn().mockResolvedValue({
        navLinks: {},
        management: {},
        catalogue: {},
        custom: { something: true },
      }),
    });
    const mockContext = securityRequestHandlerContextMock.create();

    defineAnonymousAccessGetCapabilitiesRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/security/anonymous_access/capabilities`,
      headers,
    });
    const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      navLinks: {},
      management: {},
      catalogue: {},
      custom: { something: true },
    });
  });
});
