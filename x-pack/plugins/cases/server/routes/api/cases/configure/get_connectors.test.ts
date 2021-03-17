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
  mockCaseConfigure,
  mockCaseMappings,
} from '../../__fixtures__';

import { initCaseConfigureGetActionConnector } from './get_connectors';
import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../../common';
import { getActions } from '../../__mocks__/request_responses';

describe('GET connectors', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initCaseConfigureGetActionConnector, 'get');
  });

  it('returns case owned connectors', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
      method: 'get',
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
        caseMappingsSavedObject: mockCaseMappings,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);

    const expected = getActions();
    // The first connector returned by getActions is of type .webhook and we expect to be filtered
    expected.shift();
    expect(res.payload).toEqual(expected);
  });

  it('filters out connectors that are not enabled in license', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
      method: 'get',
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
        caseMappingsSavedObject: mockCaseMappings,
      })
    );

    const actionsClient = context.actions.getActionsClient();
    (actionsClient.listTypes as jest.Mock).mockImplementation(() =>
      Promise.resolve([
        {
          id: '.servicenow',
          name: 'ServiceNow',
          minimumLicenseRequired: 'platinum',
          enabled: false,
          enabledInConfig: true,
          // User does not have a platinum license
          enabledInLicense: false,
        },
        {
          id: '.jira',
          name: 'Jira',
          minimumLicenseRequired: 'gold',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
        },
        {
          id: '.resilient',
          name: 'IBM Resilient',
          minimumLicenseRequired: 'platinum',
          enabled: false,
          enabledInConfig: true,
          // User does not have a platinum license
          enabledInLicense: false,
        },
      ])
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);
    expect(res.payload).toEqual([
      {
        id: '456',
        actionTypeId: '.jira',
        name: 'Connector without isCaseOwned',
        config: {
          apiUrl: 'https://elastic.jira.com',
        },
        isPreconfigured: false,
        referencedByCount: 0,
      },
      {
        id: 'for-mock-case-id-3',
        actionTypeId: '.jira',
        name: 'For mock case id 3',
        config: {
          apiUrl: 'https://elastic.jira.com',
        },
        isPreconfigured: false,
        referencedByCount: 0,
      },
    ]);
  });

  it('it throws an error when actions client is null', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
      method: 'get',
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
        caseMappingsSavedObject: mockCaseMappings,
      })
    );

    // @ts-expect-error
    context.actions = undefined;

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(404);
    expect(res.payload.isBoom).toEqual(true);
  });
});
