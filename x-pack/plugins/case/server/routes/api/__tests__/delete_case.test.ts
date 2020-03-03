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
  mockCasesErrorTriggerData,
} from '../__fixtures__';
import { initDeleteCaseApi } from '../delete_case';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

describe('DELETE case', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initDeleteCaseApi, 'delete');
  });
  it(`deletes the case. responds with 204`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'mock-id-1',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(204);
  });
  it(`returns an error when thrown from deleteCase service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'not-real',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
  it(`returns an error when thrown from getAllCaseComments service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'bad-guy',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository(mockCasesErrorTriggerData)
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
  it(`returns an error when thrown from deleteComment service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'valid-id',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository(mockCasesErrorTriggerData)
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
});
