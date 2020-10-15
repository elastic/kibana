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
import { initPushCaseUserActionApi } from './push_case';
import { CASE_DETAILS_URL } from '../../../../common/constants';
import { mockCaseConfigure } from '../__fixtures__/mock_saved_objects';

describe('Push case', () => {
  let routeHandler: RequestHandler<any, any, any>;
  const mockDate = '2019-11-25T21:54:48.952Z';
  const caseExternalServiceRequestBody = {
    connector_id: 'connector_id',
    connector_name: 'connector_name',
    external_id: 'external_id',
    external_title: 'external_title',
    external_url: 'external_url',
  };
  beforeAll(async () => {
    routeHandler = await createRoute(initPushCaseUserActionApi, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue(mockDate),
    }));
  });
  it(`Pushes a case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: `${CASE_DETAILS_URL}/_push`,
      method: 'post',
      params: {
        case_id: 'mock-id-3',
      },
      body: caseExternalServiceRequestBody,
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.external_service.pushed_at).toEqual(mockDate);
    expect(response.payload.external_service.connector_id).toEqual('connector_id');
    expect(response.payload.closed_at).toEqual(null);
  });
  it(`Pushes a case and closes when closure_type: 'close-by-pushing'`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: `${CASE_DETAILS_URL}/_push`,
      method: 'post',
      params: {
        case_id: 'mock-id-3',
      },
      body: caseExternalServiceRequestBody,
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseConfigureSavedObject: [
          {
            ...mockCaseConfigure[0],
            attributes: {
              ...mockCaseConfigure[0].attributes,
              closure_type: 'close-by-pushing',
            },
          },
        ],
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.external_service.pushed_at).toEqual(mockDate);
    expect(response.payload.external_service.connector_id).toEqual('connector_id');
    expect(response.payload.closed_at).toEqual(mockDate);
  });

  it(`Returns an error if pushCaseUserAction throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: `${CASE_DETAILS_URL}/_push`,
      method: 'post',
      body: {
        notagoodbody: 'Throw an error',
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
    expect(response.payload.isBoom).toEqual(true);
  });
});
