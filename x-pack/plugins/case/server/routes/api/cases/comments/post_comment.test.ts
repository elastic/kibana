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

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.comments[response.payload.comments.length - 1].id).toEqual(
      'mock-comment'
    );
  });

  it(`Posts a new comment of type alert`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        type: CommentType.alert,
        alertId: 'test-id',
        index: 'test-index',
        rule: {
          id: 'rule-id',
          name: 'rule-name',
        },
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
    expect(response.payload.comments[response.payload.comments.length - 1].id).toEqual(
      'mock-comment'
    );
  });

  it(`it throws when missing type`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {},
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

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
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

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      }),
      true
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.comments[response.payload.comments.length - 1]).toMatchInlineSnapshot(`
      Object {
        "associationType": "case",
        "comment": "Wow, good luck catching that bad meanie!",
        "created_at": "2019-11-25T21:54:48.952Z",
        "created_by": Object {
          "email": null,
          "full_name": null,
          "username": null,
        },
        "id": "mock-comment",
        "pushed_at": null,
        "pushed_by": null,
        "type": "user",
        "updated_at": null,
        "updated_by": null,
        "version": "WzksMV0=",
      }
    `);
  });
});
