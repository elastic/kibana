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
import { initPostCaseApi } from '../post_case';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

describe('POST cases', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPostCaseApi, 'post');
  });
  it(`Posts a new case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        state: 'open',
        tags: ['defacement'],
        case_type: 'security',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.id).toEqual('mock-it');
    expect(response.payload.attributes.created_by.username).toEqual('awesome');
  });
  it(`Returns an error if postNewCase throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'post',
      body: {
        description: 'Throw an error',
        title: 'Super Bad Security Issue',
        state: 'open',
        tags: ['error'],
        case_type: 'security',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
    expect(response.payload.isBoom).toEqual(true);
  });
  it(`Returns an error if user authentication throws`, async () => {
    routeHandler = await createRoute(initPostCaseApi, 'post', true);

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        state: 'open',
        tags: ['defacement'],
        case_type: 'security',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(500);
    expect(response.payload.isBoom).toEqual(true);
  });
});
