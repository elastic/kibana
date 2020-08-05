/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory, RequestHandler, SavedObject } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import { CaseAttributes } from '../../../../common/api';
import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCases,
  mockCasesErrorTriggerData,
  mockCaseComments,
} from '../__fixtures__';
import { flattenCaseSavedObject } from '../utils';
import { initGetCaseApi } from './get_case';
import { CASE_DETAILS_URL } from '../../../../common/constants';
import { mockCaseConfigure, mockCaseNoConnectorId } from '../__fixtures__/mock_saved_objects';

describe('GET case', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initGetCaseApi, 'get');
  });
  it(`returns the case with empty case comments when includeComments is false`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-id-1',
      },
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    const savedObject = (mockCases.find((s) => s.id === 'mock-id-1') as unknown) as SavedObject<
      CaseAttributes
    >;
    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(flattenCaseSavedObject({ savedObject }));
    expect(response.payload.comments).toEqual([]);
  });
  it(`returns an error when thrown from getCase`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'abcdefg',
      },
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(404);
    expect(response.payload.isBoom).toEqual(true);
  });
  it(`returns the case with case comments when includeComments is true`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-id-1',
      },
      query: {
        includeComments: true,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload.comments).toHaveLength(3);
  });
  it(`returns an error when thrown from getAllCaseComments`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'bad-guy',
      },
      query: {
        includeComments: true,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCasesErrorTriggerData,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(400);
  });
  it(`case w/o connector_id - returns the case with connector id when 3rd party unconfigured`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-no-connector_id',
      },
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: [mockCaseNoConnectorId],
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload.connector_id).toEqual('none');
  });
  it(`case w/o connector_id - returns the case with connector id when 3rd party configured`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-no-connector_id',
      },
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: [mockCaseNoConnectorId],
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload.connector_id).toEqual('123');
  });
  it(`case w/ connector_id - returns the case with connector id when case already has connectorId`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_DETAILS_URL,
      method: 'get',
      params: {
        case_id: 'mock-id-3',
      },
      query: {
        includeComments: false,
      },
    });

    const theContext = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload.connector_id).toEqual('123');
  });
});
