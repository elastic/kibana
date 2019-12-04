/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockCases, createMockSavedObjectsRepository, createRouteContext } from '../__fixtures__';
import { initGetAllCasesApi } from '../get_all_cases';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';
import { setupRoute } from './test_utils';

describe('GET all cases', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await setupRoute(initGetAllCasesApi, 'get');
  });
  it(`returns the case without case comments when includeComments is false`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'get',
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.saved_objects).toHaveLength(3);
  });
});
