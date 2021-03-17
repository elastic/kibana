/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { flattenCommentSavedObject } from '../../utils';
import { initGetCommentApi } from './get_comment';
import { CASE_COMMENT_DETAILS_URL } from '../../../../../common';

describe('GET comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initGetCommentApi, 'get');
  });
  it(`returns the comment`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENT_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-id-1',
        comment_id: 'mock-comment-1',
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    const myPayload = mockCaseComments.find((s) => s.id === 'mock-comment-1');
    expect(myPayload).not.toBeUndefined();
    if (myPayload != null) {
      expect(response.payload).toEqual(flattenCommentSavedObject(myPayload));
    }
  });
  it(`returns an error when getComment throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENT_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-id-1',
        comment_id: 'not-real',
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
});
