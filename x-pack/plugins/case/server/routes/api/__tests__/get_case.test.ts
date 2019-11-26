/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createCases, createMockSavedObjectsRepository, createRouteContext } from '../__fixtures__';
import { initGetCaseApi } from '../get_case';
import { IRouter, kibanaResponseFactory } from 'src/core/server';
import { loggingServiceMock, httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { CaseService } from '../../../services';
import { securityMock } from '../../../../../security/server/mocks';

describe('GET case', () => {
  const caseSavedObjects = createCases();
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    const log = loggingServiceMock.create().get('case');

    const service = new CaseService(log);
    const caseService = await service.setup({
      authentication: securityMock.createSetup().authc,
    });

    initGetCaseApi({
      router,
      caseService,
    });

    return {
      routeHandler: router.get.mock.calls[0][1],
    };
  };
  it(`returns the case with that id`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{id}',
      params: {
        id: '3379c780-0fce-11ea-a2db-6b4d84335bfc',
      },
      method: 'get',
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(createMockSavedObjectsRepository(caseSavedObjects));

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(
      caseSavedObjects.find(s => s.id === '3379c780-0fce-11ea-a2db-6b4d84335bfc')
    );
  });
});
