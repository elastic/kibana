/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCases,
  mockCaseConfigure,
  mockCaseMappings,
  mockUserActions,
} from '../__fixtures__';
import { initPushCaseApi } from './push_case';
import { CasesRequestHandlerContext } from '../../../types';
import { getCasePushUrl } from '../../../../common/api/helpers';

describe('Push case', () => {
  let routeHandler: RequestHandler<any, any, any>;
  const mockDate = '2019-11-25T21:54:48.952Z';
  const caseId = 'mock-id-3';
  const connectorId = '123';
  const path = getCasePushUrl(caseId, connectorId);

  beforeAll(async () => {
    routeHandler = await createRoute(initPushCaseApi, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue(mockDate),
    }));
  });

  it(`Pushes a case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.external_service).toEqual({
      connector_id: connectorId,
      connector_name: 'ServiceNow',
      external_id: '10663',
      external_title: 'RJ2-200',
      external_url: 'https://siem-kibana.atlassian.net/browse/RJ2-200',
      pushed_at: mockDate,
      pushed_by: {
        email: 'd00d@awesome.com',
        full_name: 'Awesome D00d',
        username: 'awesome',
      },
    });
  });

  it(`Pushes a case and closes when closure_type: 'close-by-pushing'`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseUserActionsSavedObject: mockUserActions,
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
    expect(response.payload.closed_at).toEqual(mockDate);
  });

  it('Unhappy path - context case missing', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const betterContext = ({
      ...theContext,
      case: null,
    } as unknown) as CasesRequestHandlerContext;

    const res = await routeHandler(betterContext, request, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload).toEqual('RouteHandlerContext is not registered for cases');
  });

  it('Unhappy path - context actions missing', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const betterContext = ({
      ...theContext,
      actions: null,
    } as unknown) as CasesRequestHandlerContext;

    const res = await routeHandler(betterContext, request, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload).toEqual('Action client not found');
  });
});
