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
} from '../__fixtures__';
import { initFindCasesApi } from './find_cases';
import { CASES_URL } from '../../../../common/constants';
import { mockCaseConfigure, mockCaseNoConnectorId } from '../__fixtures__/mock_saved_objects';

describe('FIND all cases', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initFindCasesApi, 'get');
  });

  it(`gets all the cases`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: `${CASES_URL}/_find`,
      method: 'get',
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.cases).toHaveLength(4);
  });

  it(`has proper connector id on cases with configured connector`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: `${CASES_URL}/_find`,
      method: 'get',
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.cases[2].connector.id).toEqual('123');
  });

  it(`adds 'none' connector id to cases without when 3rd party unconfigured`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: `${CASES_URL}/_find`,
      method: 'get',
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: [mockCaseNoConnectorId],
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.cases[0].connector.id).toEqual('none');
  });

  it(`adds default connector id to cases without when 3rd party configured`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: `${CASES_URL}/_find`,
      method: 'get',
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: [mockCaseNoConnectorId],
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.cases[0].connector.id).toEqual('none');
  });
});
