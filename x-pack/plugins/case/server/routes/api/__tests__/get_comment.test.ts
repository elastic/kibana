/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCaseComments,
} from '../__fixtures__';
import { initGetCommentApi } from '../get_comment';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

describe('GET comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initGetCommentApi, 'get');
  });
  it(`returns the comment`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comments/{id}',
      method: 'get',
      params: {
        id: 'mock-comment-1',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCaseComments));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(mockCaseComments.find(s => s.id === 'mock-comment-1'));
  });
  it(`returns an error when getComment throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comments/{id}',
      method: 'get',
      params: {
        id: 'not-real',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCaseComments));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
});
