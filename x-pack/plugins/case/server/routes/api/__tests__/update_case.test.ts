/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCases,
} from '../__fixtures__';
import { initUpdateCaseApi } from '../update_case';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

describe('UPDATE case', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initUpdateCaseApi, 'patch');
  });
  it(`Updates a case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'patch',
      params: {
        id: 'mock-id-1',
      },
      body: {
        case: { state: 'closed' },
        version: 'WzAsMV0=',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(typeof response.payload.updated_at).toBe('string');
    expect(response.payload.state).toEqual('closed');
  });
  it(`Fails with 409 if version does not match`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'patch',
      params: {
        id: 'mock-id-1',
      },
      body: {
        case: { state: 'closed' },
        version: 'badv=',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(409);
  });
  it(`Fails with 406 if updated field is unchanged`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'patch',
      params: {
        id: 'mock-id-1',
      },
      body: {
        case: { state: 'open' },
        version: 'WzAsMV0=',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(406);
  });
  it(`Returns an error if updateCase throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'patch',
      params: {
        id: 'mock-id-does-not-exist',
      },
      body: {
        state: 'closed',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
    expect(response.payload.isBoom).toEqual(true);
  });
});
