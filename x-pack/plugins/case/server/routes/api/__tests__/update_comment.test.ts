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
import { initUpdateCommentApi } from '../update_comment';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

describe('UPDATE comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initUpdateCommentApi, 'patch');
  });
  it(`Updates a comment`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comment/{id}',
      method: 'patch',
      params: {
        id: 'mock-comment-1',
      },
      body: {
        comment: 'Update my comment',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCaseComments));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.comment).toEqual('Update my comment');
  });
  it(`Returns an error if updateComment throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comment/{id}',
      method: 'patch',
      params: {
        id: 'mock-comment-does-not-exist',
      },
      body: {
        comment: 'Update my comment',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCaseComments));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
    expect(response.payload.isBoom).toEqual(true);
  });
});
