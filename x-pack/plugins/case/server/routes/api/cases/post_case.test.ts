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
import { initPostCaseApi } from './post_case';
import { CASES_URL } from '../../../../common/constants';
import { mockCaseConfigure } from '../__fixtures__/mock_saved_objects';
import { ConnectorTypes, CaseStatuses } from '../../../../common/api';

describe('POST cases', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPostCaseApi, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
    }));
  });

  it(`Posts a new case, no connector configured`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        tags: ['defacement'],
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.id).toEqual('mock-it');
    expect(response.payload.status).toEqual('open');
    expect(response.payload.created_by.username).toEqual('awesome');
    expect(response.payload.connector).toEqual({
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
      fields: null,
    });
  });

  it(`Posts a new case, connector provided`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        tags: ['defacement'],
        connector: {
          id: '123',
          name: 'Jira',
          type: '.jira',
          fields: { issueType: 'Task', priority: 'High', parent: null },
        },
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.connector).toEqual({
      id: '123',
      name: 'Jira',
      type: '.jira',
      fields: { issueType: 'Task', priority: 'High', parent: null },
    });
  });

  it(`Error if you passing status for a new case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        status: CaseStatuses.open,
        tags: ['defacement'],
        connector: null,
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });

  it(`Returns an error if postNewCase throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'post',
      body: {
        description: 'Throw an error',
        title: 'Super Bad Security Issue',
        tags: ['error'],
        connector: null,
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
    expect(response.payload.isBoom).toEqual(true);
  });

  it(`Allow user to create case without authentication`, async () => {
    routeHandler = await createRoute(initPostCaseApi, 'post', true);

    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        tags: ['defacement'],
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseConfigureSavedObject: mockCaseConfigure,
      }),
      true
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({
      closed_at: null,
      closed_by: null,
      comments: [],
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      created_at: '2019-11-25T21:54:48.952Z',
      created_by: {
        email: null,
        full_name: null,
        username: null,
      },
      description: 'This is a brand new case of a bad meanie defacing data',
      external_service: null,
      id: 'mock-it',
      status: CaseStatuses.open,
      tags: ['defacement'],
      title: 'Super Bad Security Issue',
      totalComment: 0,
      updated_at: null,
      updated_by: null,
      version: 'WzksMV0=',
    });
  });
});
