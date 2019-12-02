/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  authenticationMock,
  createMockSavedObjectsRepository,
  createRouteContext,
  mockCaseComments,
} from '../__fixtures__';
import { initUpdateCommentApi } from '../update_comment';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';

describe('UPDATE comment', () => {
  const setup = async (badAuth = false) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
    });

    initUpdateCommentApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.post.mock.calls[0][1],
    };
  };
  it(`Updates a comment`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comment/{id}',
      method: 'post',
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
    expect(response.payload.id).toEqual('mock-comment-1');
    expect(response.payload.attributes.comment).toEqual('Update my comment');
  });
  it(`Returns an error if updateComment throws`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comment/{id}',
      method: 'post',
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
