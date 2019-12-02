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
import { initDeleteCaseApi } from '../delete_case';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';
import { securityMock } from '../../../../../security/server/mocks';

describe('DELETE case', () => {
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: securityMock.createSetup().authc,
    });

    initDeleteCaseApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.delete.mock.calls[0][1],
    };
  };
  it(`deletes the case. responds with 204`, async () => {
    const { routeHandler } = await setup();
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'mock-id-1',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(204);
  });
  it(`returns an error when thrown from deleteCase service`, async () => {
    const { routeHandler } = await setup();
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'not-real',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
  it(`returns an error when thrown from getAllCaseComments service`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'bad-guy',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository(mockCasesErrorTriggerData)
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
  it(`returns an error when thrown from deleteComment service`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'delete',
      params: {
        id: 'valid-id',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository(mockCasesErrorTriggerData)
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
});
