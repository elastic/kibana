/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockCases,
  mockCasesErrorTriggerData,
  createMockSavedObjectsRepository,
  createRouteContext,
} from '../__fixtures__';
import { initDeleteCommentApi } from '../delete_comment';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';
import { securityMock } from '../../../../../security/server/mocks';

describe('DELETE comment', () => {
  const caseSavedObjects = mockCases;
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: securityMock.createSetup().authc,
    });

    initDeleteCommentApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.delete.mock.calls[0][1],
    };
  };
  it(`deletes the comment. responds with 204`, async () => {
    const { routeHandler } = await setup();
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}/comments/{comment_id}',
      method: 'delete',
      params: {
        case_id: 'valid-id',
        comment_id: '3379c780-0fce-11ea-a2db-6b4d84335bfc',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(caseSavedObjects));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(204);
  });
  it(`returns an error when thrown from deleteComment service`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}/comments/{comment_id}',
      method: 'delete',
      params: {
        case_id: 'valid-id',
        comment_id: 'bad-guy',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository(mockCasesErrorTriggerData)
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
});
