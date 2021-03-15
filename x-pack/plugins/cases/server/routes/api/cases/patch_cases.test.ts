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
  mockCaseComments,
} from '../__fixtures__';
import { initPatchCasesApi } from './patch_cases';
import { mockCaseConfigure, mockCaseNoConnectorId } from '../__fixtures__/mock_saved_objects';
import { CaseStatuses } from '../../../../common/api';

describe('PATCH cases', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPatchCasesApi, 'patch');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
    }));
  });

  it(`Close a case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-1',
            status: CaseStatuses.closed,
            version: 'WzAsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Array [
        Object {
          "closed_at": "2019-11-25T21:54:48.952Z",
          "closed_by": Object {
            "email": "d00d@awesome.com",
            "full_name": "Awesome D00d",
            "username": "awesome",
          },
          "comments": Array [],
          "connector": Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          },
          "created_at": "2019-11-25T21:54:48.952Z",
          "created_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "description": "This is a brand new case of a bad meanie defacing data",
          "external_service": null,
          "id": "mock-id-1",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "closed",
          "subCaseIds": undefined,
          "subCases": undefined,
          "tags": Array [
            "defacement",
          ],
          "title": "Super Bad Security Issue",
          "totalAlerts": 0,
          "totalComment": 0,
          "type": "individual",
          "updated_at": "2019-11-25T21:54:48.952Z",
          "updated_by": Object {
            "email": "d00d@awesome.com",
            "full_name": "Awesome D00d",
            "username": "awesome",
          },
          "version": "WzE3LDFd",
        },
      ]
    `);
  });

  it(`Open a case`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-4',
            status: CaseStatuses.open,
            version: 'WzUsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Array [
        Object {
          "closed_at": null,
          "closed_by": null,
          "comments": Array [],
          "connector": Object {
            "fields": Object {
              "issueType": "Task",
              "parent": null,
              "priority": "High",
            },
            "id": "123",
            "name": "My connector",
            "type": ".jira",
          },
          "created_at": "2019-11-25T22:32:17.947Z",
          "created_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "description": "Oh no, a bad meanie going LOLBins all over the place!",
          "external_service": null,
          "id": "mock-id-4",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "open",
          "subCaseIds": undefined,
          "subCases": undefined,
          "tags": Array [
            "LOLBins",
          ],
          "title": "Another bad one",
          "totalAlerts": 0,
          "totalComment": 0,
          "type": "individual",
          "updated_at": "2019-11-25T21:54:48.952Z",
          "updated_by": Object {
            "email": "d00d@awesome.com",
            "full_name": "Awesome D00d",
            "username": "awesome",
          },
          "version": "WzE3LDFd",
        },
      ]
    `);
  });

  it(`Change case to in-progress`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-1',
            status: CaseStatuses['in-progress'],
            version: 'WzAsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload).toMatchInlineSnapshot(`
      Array [
        Object {
          "closed_at": null,
          "closed_by": null,
          "comments": Array [],
          "connector": Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          },
          "created_at": "2019-11-25T21:54:48.952Z",
          "created_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "description": "This is a brand new case of a bad meanie defacing data",
          "external_service": null,
          "id": "mock-id-1",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "in-progress",
          "subCaseIds": undefined,
          "subCases": undefined,
          "tags": Array [
            "defacement",
          ],
          "title": "Super Bad Security Issue",
          "totalAlerts": 0,
          "totalComment": 0,
          "type": "individual",
          "updated_at": "2019-11-25T21:54:48.952Z",
          "updated_by": Object {
            "email": "d00d@awesome.com",
            "full_name": "Awesome D00d",
            "username": "awesome",
          },
          "version": "WzE3LDFd",
        },
      ]
    `);
  });

  it(`Patches a case without a connector.id`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-no-connector_id',
            status: CaseStatuses.closed,
            version: 'WzAsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: [mockCaseNoConnectorId],
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload[0].connector.id).toEqual('none');
  });

  it(`Patches a case with a connector.id`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-3',
            status: CaseStatuses.closed,
            version: 'WzUsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload[0].connector.id).toEqual('123');
  });

  it(`Change connector`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-3',
            connector: {
              id: '456',
              name: 'My connector 2',
              type: '.jira',
              fields: { issueType: 'Bug', priority: 'Low', parent: null },
            },
            version: 'WzUsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload[0].connector).toEqual({
      id: '456',
      name: 'My connector 2',
      type: '.jira',
      fields: { issueType: 'Bug', priority: 'Low', parent: null },
    });
  });

  it(`Fails with 409 if version does not match`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-1',
            case: { status: CaseStatuses.closed },
            version: 'badv=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(409);
  });

  it(`Fails with 406 if updated field is unchanged`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-1',
            case: { status: CaseStatuses.open },
            version: 'WzAsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(406);
  });

  it(`Returns an error if updateCase throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-does-not-exist',
            status: CaseStatuses.closed,
            version: 'WzAsMV0=',
          },
        ],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
    expect(response.payload.isBoom).toEqual(true);
  });
});
