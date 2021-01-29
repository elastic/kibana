/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCases,
  mockCaseComments,
} from '../../__fixtures__';
import { initDeleteCommentApi } from './delete_comment';
import { CASE_COMMENT_DETAILS_URL } from '../../../../../common/constants';

describe('DELETE comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initDeleteCommentApi, 'delete');
  });
  it(`deletes the comment. responds with 204`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENT_DETAILS_URL,
      method: 'delete',
      params: {
        case_id: 'mock-id-1',
        comment_id: 'mock-comment-1',
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(204);
  });
  it(`returns an error when thrown from deleteComment service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENT_DETAILS_URL,
      method: 'delete',
      params: {
        case_id: 'mock-id-1',
        comment_id: 'bad-guy',
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
});
