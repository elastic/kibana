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
import { initDeleteCommentApi } from '../delete_comment';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

describe('DELETE comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initDeleteCommentApi, 'delete');
  });
  it(`deletes the comment. responds with 204`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comments/{comment_id}',
      method: 'delete',
      params: {
        comment_id: 'mock-id-1',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(204);
  });
  it(`returns an error when thrown from deleteComment service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comments/{comment_id}',
      method: 'delete',
      params: {
        comment_id: 'bad-guy',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository(mockCasesErrorTriggerData)
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
});
