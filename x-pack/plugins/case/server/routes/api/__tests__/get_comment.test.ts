/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockCaseComments,
  createMockSavedObjectsRepository,
  createRouteContext,
} from '../__fixtures__';
import { initGetCommentApi } from '../get_comment';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';
import { securityMock } from '../../../../../security/server/mocks';

describe('GET comment', () => {
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: securityMock.createSetup().authc,
    });

    initGetCommentApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.get.mock.calls[0][1],
    };
  };
  it(`returns the comment`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comments/{id}',
      method: 'get',
      params: {
        id: 'mock-comment-1',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCaseComments));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(mockCaseComments.find(s => s.id === 'mock-comment-1'));
  });
  it(`returns an error when getComment throws`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/comments/{id}',
      method: 'get',
      params: {
        id: 'not-real',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCaseComments));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
});
