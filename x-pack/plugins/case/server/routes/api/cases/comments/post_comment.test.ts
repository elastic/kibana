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

describe('POST comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPostCommentApi, 'post');
  });
  it(`Posts a new comment`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}/comments',
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Wow, good luck catching that bad meanie!',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.id).toEqual('mock-comment');
  });
  it(`Returns an error if the case does not exist`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}/comments',
      method: 'post',
      params: {
        case_id: 'this-is-not-real',
      },
      body: {
        comment: 'Wow, good luck catching that bad meanie!',
      },
    });

    const theContext = createRouteContext(
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
      path: '/api/cases/{case_id}/comments',
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Throw an error',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
    expect(response.payload.isBoom).toEqual(true);
  });
  it(`Returns an error if user authentication throws`, async () => {
    routeHandler = await createRoute(initPostCommentApi, 'post', true);

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}/comments',
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Wow, good luck catching that bad meanie!',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(500);
    expect(response.payload.isBoom).toEqual(true);
  });
});
