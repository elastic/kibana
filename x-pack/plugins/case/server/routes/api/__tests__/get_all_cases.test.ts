/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockCases, createMockSavedObjectsRepository, createRouteContext } from '../__fixtures__';
import { initGetAllCasesApi } from '../get_all_cases';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';
import { securityMock } from '../../../../../security/server/mocks';

describe('GET all cases', () => {
  const caseSavedObjects = mockCases;
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: securityMock.createSetup().authc,
    });

    initGetAllCasesApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.get.mock.calls[0][1],
    };
  };
  it(`returns the case without case comments when includeComments is false`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'get',
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(caseSavedObjects));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.saved_objects).toHaveLength(3);
  });
});
