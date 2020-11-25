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
import { initPostCommentApi } from './post_comment';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { CommentType } from '../../../../../common/api';

describe('POST comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPostCommentApi, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
    }));
  });

  it(`Posts a new comment`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Wow, good luck catching that bad meanie!',
        type: CommentType.user,
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
    expect(response.payload.comments[response.payload.comments.length - 1].id).toEqual(
      'mock-comment'
    );
  });

  it(`Returns an error if the case does not exist`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'post',
      params: {
        case_id: 'this-is-not-real',
      },
      body: {
        comment: 'Wow, good luck catching that bad meanie!',
        type: CommentType.user,
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

  it(`Returns an error if postNewCase throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Throw an error',
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
    expect(response.payload.isBoom).toEqual(true);
  });

  it(`Allow user to create comments without authentications`, async () => {
    routeHandler = await createRoute(initPostCommentApi, 'post', true);

    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Wow, good luck catching that bad meanie!',
        type: CommentType.user,
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      }),
      true
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.comments[response.payload.comments.length - 1]).toEqual({
      comment: 'Wow, good luck catching that bad meanie!',
      type: CommentType.user,
      created_at: '2019-11-25T21:54:48.952Z',
      created_by: {
        email: null,
        full_name: null,
        username: null,
      },
      id: 'mock-comment',
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
      version: 'WzksMV0=',
    });
  });
});
