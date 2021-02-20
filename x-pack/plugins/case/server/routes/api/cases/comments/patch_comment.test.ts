/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
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
import { CommentType } from '../../../../../common/api';

describe('PATCH comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPatchCommentApi, 'patch');
  });

  it(`Patch a comment`, async () => {
    const commentID = 'mock-comment-1';
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'patch',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        type: CommentType.user,
        comment: 'Update my comment',
        id: commentID,
        version: 'WzEsMV0=',
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
    const updatedComment = response.payload.comments.find(
      (comment: { id: string }) => comment.id === commentID
    );
    expect(updatedComment.comment).toEqual('Update my comment');
  });

  it(`Patch an alert`, async () => {
    const commentID = 'mock-comment-4';
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'patch',
      params: {
        case_id: 'mock-id-4',
      },
      body: {
        type: CommentType.alert,
        alertId: 'new-id',
        index: 'test-index',
        rule: {
          id: 'rule-id',
          name: 'rule',
        },
        id: commentID,
        version: 'WzYsMV0=',
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
    const updatedComment = response.payload.comments.find(
      (comment: { id: string }) => comment.id === commentID
    );
    expect(updatedComment.alertId).toEqual('new-id');
  });

  it(`it throws when missing attributes: type user`, async () => {
    const allRequestAttributes = {
      type: CommentType.user,
      comment: 'a comment',
    };

    for (const attribute of ['comment']) {
      const requestAttributes = omit(attribute, allRequestAttributes);
      const request = httpServerMock.createKibanaRequest({
        path: CASE_COMMENTS_URL,
        method: 'post',
        params: {
          case_id: 'mock-id-1',
        },
        body: requestAttributes,
      });

      const { context } = await createRouteContext(
        createMockSavedObjectsRepository({
          caseSavedObject: mockCases,
          caseCommentSavedObject: mockCaseComments,
        })
      );

      const response = await routeHandler(context, request, kibanaResponseFactory);
      expect(response.status).toEqual(400);
      expect(response.payload.isBoom).toEqual(true);
    }
  });

  it(`it throws when excess attributes are provided: type user`, async () => {
    for (const attribute of ['alertId', 'index']) {
      const request = httpServerMock.createKibanaRequest({
        path: CASE_COMMENTS_URL,
        method: 'post',
        params: {
          case_id: 'mock-id-1',
        },
        body: {
          [attribute]: attribute,
          comment: 'a comment',
          type: CommentType.user,
        },
      });

      const { context } = await createRouteContext(
        createMockSavedObjectsRepository({
          caseSavedObject: mockCases,
          caseCommentSavedObject: mockCaseComments,
        })
      );

      const response = await routeHandler(context, request, kibanaResponseFactory);
      expect(response.status).toEqual(400);
      expect(response.payload.isBoom).toEqual(true);
    }
  });

  it(`it throws when missing attributes: type alert`, async () => {
    const allRequestAttributes = {
      type: CommentType.alert,
      index: 'test-index',
      alertId: 'test-id',
    };

    for (const attribute of ['alertId', 'index']) {
      const requestAttributes = omit(attribute, allRequestAttributes);
      const request = httpServerMock.createKibanaRequest({
        path: CASE_COMMENTS_URL,
        method: 'post',
        params: {
          case_id: 'mock-id-1',
        },
        body: requestAttributes,
      });

      const { context } = await createRouteContext(
        createMockSavedObjectsRepository({
          caseSavedObject: mockCases,
          caseCommentSavedObject: mockCaseComments,
        })
      );

      const response = await routeHandler(context, request, kibanaResponseFactory);
      expect(response.status).toEqual(400);
      expect(response.payload.isBoom).toEqual(true);
    }
  });

  it(`it throws when excess attributes are provided: type alert`, async () => {
    for (const attribute of ['comment']) {
      const request = httpServerMock.createKibanaRequest({
        path: CASE_COMMENTS_URL,
        method: 'post',
        params: {
          case_id: 'mock-id-1',
        },
        body: {
          [attribute]: attribute,
          type: CommentType.alert,
          index: 'test-index',
          alertId: 'test-id',
        },
      });

      const { context } = await createRouteContext(
        createMockSavedObjectsRepository({
          caseSavedObject: mockCases,
          caseCommentSavedObject: mockCaseComments,
        })
      );

      const response = await routeHandler(context, request, kibanaResponseFactory);
      expect(response.status).toEqual(400);
      expect(response.payload.isBoom).toEqual(true);
    }
  });

  it(`it fails to change the type of the comment`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'patch',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        type: CommentType.alert,
        alertId: 'test-id',
        index: 'test-index',
        rule: {
          id: 'rule-id',
          name: 'rule',
        },
        id: 'mock-comment-1',
        version: 'WzEsMV0=',
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
    expect(response.payload.isBoom).toEqual(true);
    expect(response.payload.message).toEqual('You cannot change the type of the comment.');
  });

  it(`Fails with 409 if version does not match`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'patch',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        type: CommentType.user,
        id: 'mock-comment-1',
        comment: 'Update my comment',
        version: 'badv=',
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
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
        type: CommentType.user,
        comment: 'Update my comment',
        id: 'mock-comment-does-not-exist',
        version: 'WzEsMV0=',
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
    expect(response.payload.isBoom).toEqual(true);
  });
});
