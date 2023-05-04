/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import type { AnonymousAccessServiceStart } from '../../anonymous_access';
import { routeDefinitionParamsMock, securityRequestHandlerContextMock } from '../index.mock';
import { defineAnonymousAccessGetStateRoutes } from './get_state';

describe('GET /internal/security/anonymous_access/state', () => {
  function doMockAndTest(accessURLParameters: AnonymousAccessServiceStart['accessURLParameters']) {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.getAnonymousAccessService.mockReturnValue({
      isAnonymousAccessEnabled: true,
      accessURLParameters,
      getCapabilities: jest.fn(),
    });
    const mockContext = securityRequestHandlerContextMock.create();

    defineAnonymousAccessGetStateRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/security/anonymous_access/state`,
      headers,
    });
    return handler(mockContext, mockRequest, kibanaResponseFactory);
  }

  it('returns anonymous access state (with access URL parameters)', async () => {
    const response = await doMockAndTest(new Map([['auth_provider_hint', 'anonymous1']]));
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      isEnabled: true,
      accessURLParameters: { auth_provider_hint: 'anonymous1' },
    });
  });

  it('returns anonymous access state (without access URL parameters)', async () => {
    const response = await doMockAndTest(null);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      isEnabled: true,
      accessURLParameters: null,
    });
  });
});
