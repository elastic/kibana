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
import { initGetCaseApi } from '../get_case';
import { kibanaResponseFactory, RequestHandler, SavedObject } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';
import { flattenCaseSavedObject } from '../utils';
import { CaseAttributes } from '../types';

describe('GET case', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initGetCaseApi, 'get');
  });
  it(`returns the case with empty case comments when includeComments is false`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      params: {
        id: 'mock-id-1',
      },
      method: 'get',
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(
      flattenCaseSavedObject(
        (mockCases.find(s => s.id === 'mock-id-1') as unknown) as SavedObject<CaseAttributes>,
        []
      )
    );
    expect(response.payload.comments).toEqual([]);
  });
  it(`returns an error when thrown from getCase`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      params: {
        id: 'abcdefg',
      },
      method: 'get',
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(404);
    expect(response.payload.isBoom).toEqual(true);
  });
  it(`returns the case with case comments when includeComments is true`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      params: {
        id: 'mock-id-1',
      },
      method: 'get',
      query: {
        includeComments: true,
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload.comments).toHaveLength(3);
  });
  it(`returns an error when thrown from getAllCaseComments`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      params: {
        id: 'bad-guy',
      },
      method: 'get',
      query: {
        includeComments: true,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository(mockCasesErrorTriggerData)
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(400);
  });
});
