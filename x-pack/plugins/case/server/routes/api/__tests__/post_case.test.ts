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
import { initPostCaseApi } from '../post_case';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';

describe('POST cases', () => {
  const setup = async (badAuth = false) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: badAuth ? authenticationMock.createInvalid() : authenticationMock.create(),
    });

    initPostCaseApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.post.mock.calls[0][1],
    };
  };
  it(`Posts a new case`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        state: 'open',
        tags: ['defacement'],
        case_type: 'security',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.id).toEqual('mock-it');
    expect(response.payload.attributes.reporter.username).toEqual('awesome');
  });
  it(`Returns an error if user authentication throws`, async () => {
    const { routeHandler } = await setup(true);

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        state: 'open',
        tags: ['defacement'],
        case_type: 'security',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(500);
    expect(response.payload.isBoom).toEqual(true);
  });
  it(`Returns an error if postNewCase throws`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'post',
      body: {
        description: 'Throw an error',
        title: 'Super Bad Security Issue',
        state: 'open',
        tags: ['error'],
        case_type: 'security',
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(mockCases));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
    expect(response.payload.isBoom).toEqual(true);
  });
});
