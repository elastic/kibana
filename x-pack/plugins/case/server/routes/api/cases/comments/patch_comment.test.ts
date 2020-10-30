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
  mockCaseComments,
  mockCases,
} from '../../__fixtures__';
import { initPatchCommentApi } from './patch_comment';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';

describe('PATCH comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPatchCommentApi, 'patch');
  });
  it(`Patch a comment`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'patch',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Update my comment',
        id: 'mock-comment-1',
        version: 'WzEsMV0=',
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.comments[response.payload.comments.length - 1].comment).toEqual(
      'Update my comment'
    );
  });

  it(`Fails with 409 if version does not match`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'patch',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        id: 'mock-comment-1',
        comment: 'Update my comment',
        version: 'badv=',
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(409);
  });
  it(`Returns an error if updateComment throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'patch',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Update my comment',
        id: 'mock-comment-does-not-exist',
        version: 'WzEsMV0=',
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
    expect(response.payload.isBoom).toEqual(true);
  });
});
