/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  authenticationMock,
  createMockSavedObjectsRepository,
  createRouteContext,
  mockCases,
} from '../__fixtures__';
import { initUpdateCaseApi } from '../update_case';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';

describe('UPDATE case', () => {
  const setup = async (badAuth = false) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
    });

    initUpdateCaseApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.post.mock.calls[0][1],
    };
  };
  it(`Updates a case`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'post',
      params: {
        id: 'mock-id-1',
      },
      body: {
        state: 'closed',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.id).toEqual('mock-id-1');
    expect(response.payload.attributes.state).toEqual('closed');
  });
  it(`Returns an error if updateCase throws`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      method: 'post',
      params: {
        id: 'mock-id-does-not-exist',
      },
      body: {
        state: 'closed',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
    expect(response.payload.isBoom).toEqual(true);
  });
});
