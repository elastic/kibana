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
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { CaseClient } from '../../../../client';
import { initPostCommentApi } from './post_comment';
import { ConnectorTypes } from '../../../../../common/api';

describe('POST comment', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPostCommentApi, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2020-10-23T21:54:48.952Z'),
    }));
  });

  it(`it adds a new comment`, async () => {
    const addCommentResult = {
      id: 'mock-id-1',
      version: 'WzE3LDFd',
      comments: [
        {
          id: 'mock-comment-1',
          version: 'WzEsMV0=',
          comment: 'Wow, good luck catching that bad meanie!',
          created_at: '2019-11-25T21:55:00.177Z',
          created_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          pushed_at: null,
          pushed_by: null,
          updated_at: '2019-11-25T21:55:00.177Z',
          updated_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
        },
        {
          id: 'mock-comment',
          version: 'WzksMV0=',
          comment: 'Wow, good luck catching that bad meanie!',
          created_at: '2020-10-23T21:54:48.952Z',
          created_by: {
            email: 'd00d@awesome.com',
            full_name: 'Awesome D00d',
            username: 'awesome',
          },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      ],
      totalComment: 2,
      closed_at: null,
      closed_by: null,
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      created_at: '2019-11-25T21:54:48.952Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      description: 'This is a brand new case of a bad meanie defacing data',
      external_service: null,
      title: 'Super Bad Security Issue',
      status: 'open' as const,
      tags: ['defacement'],
      updated_at: '2020-10-23T21:54:48.952Z',
      updated_by: {
        username: 'awesome',
        full_name: 'Awesome D00d',
        email: 'd00d@awesome.com',
      },
    };

    const request = httpServerMock.createKibanaRequest({
      path: CASE_COMMENTS_URL,
      method: 'post',
      params: {
        case_id: 'mock-id-1',
      },
      body: {
        comment: 'Wow, good luck catching that bad meanie!',
      },
    });

    const context = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );
    const caseClient = context.case!.getCaseClient() as jest.Mocked<CaseClient>;
    caseClient.addComment.mockResolvedValueOnce(addCommentResult);
    const response = await routeHandler(context, request, kibanaResponseFactory);

    expect(caseClient.addComment).toHaveBeenCalledTimes(1);
    expect(caseClient.addComment).toHaveBeenCalledWith({
      caseId: request.params.case_id,
      comment: request.body,
    });
    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(addCommentResult);
  });
});
