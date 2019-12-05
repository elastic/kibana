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
    routeHandler = await createRoute(initUpdateCaseApi, 'post');
  });
  it(`Updates a case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'post',
      params: {
        id: 'mock-id-1',
      },
      body: {
        state: 'closed',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.id).toEqual('mock-id-1');
    expect(response.payload.attributes.state).toEqual('closed');
  });
  it(`Returns an error if updateCase throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'post',
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
