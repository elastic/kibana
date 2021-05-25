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
  mockCaseComments,
} from '../__fixtures__';
import { initPushCaseApi } from './push_case';
import { CasesRequestHandlerContext } from '../../../types';
import { getCasePushUrl } from '../../../../common';

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

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
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

  it(`Pushes a case with comments`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
        caseCommentSavedObject: [mockCaseComments[0]],
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.comments[0].pushed_at).toEqual(mockDate);
    expect(response.payload.comments[0].pushed_by).toEqual({
      email: 'd00d@awesome.com',
      full_name: 'Awesome D00d',
      username: 'awesome',
    });
  });

  it(`Filters comments with type alert correctly`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
        caseCommentSavedObject: [mockCaseComments[0], mockCaseComments[3]],
      })
    );

    const casesClient = context.cases.getCasesClient();
    casesClient.getAlerts = jest.fn().mockResolvedValue([]);

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(casesClient.getAlerts).toHaveBeenCalledWith({
      alertsInfo: [{ id: 'test-id', index: 'test-index' }],
    });
  });

  it(`Calls execute with correct arguments`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: 'for-mock-case-id-3',
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const actionsClient = context.actions.getActionsClient();

    await routeHandler(context, request, kibanaResponseFactory);
    expect(actionsClient.execute).toHaveBeenCalledWith({
      actionId: 'for-mock-case-id-3',
      params: {
        subAction: 'pushToService',
        subActionParams: {
          incident: {
            issueType: 'Task',
            parent: null,
            priority: 'High',
            labels: ['LOLBins'],
            summary: 'Another bad one',
            description:
              'Oh no, a bad meanie going LOLBins all over the place! (created at 2019-11-25T22:32:17.947Z by elastic)',
            externalId: null,
          },
          comments: [],
        },
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

    const { context } = await createRouteContext(
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

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(response.payload.closed_at).toEqual(mockDate);
  });

  it(`post the correct user action`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const { context, services } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    services.userActionService.postUserActions = jest.fn();
    const postUserActions = services.userActionService.postUserActions as jest.Mock;

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
    expect(postUserActions.mock.calls[0][0].actions[0].attributes).toEqual({
      action: 'push-to-service',
      action_at: '2019-11-25T21:54:48.952Z',
      action_by: {
        email: 'd00d@awesome.com',
        full_name: 'Awesome D00d',
        username: 'awesome',
      },
      action_field: ['pushed'],
      new_value:
        '{"pushed_at":"2019-11-25T21:54:48.952Z","pushed_by":{"username":"awesome","full_name":"Awesome D00d","email":"d00d@awesome.com"},"connector_id":"123","connector_name":"ServiceNow","external_id":"10663","external_title":"RJ2-200","external_url":"https://siem-kibana.atlassian.net/browse/RJ2-200"}',
      old_value: null,
    });
  });

  it('Unhappy path - case id is missing', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        connector_id: connectorId,
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const res = await routeHandler(context, request, kibanaResponseFactory);
    expect(res.status).toEqual(400);
  });

  it('Unhappy path - connector id is missing', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const res = await routeHandler(context, request, kibanaResponseFactory);
    expect(res.status).toEqual(400);
  });

  it('Unhappy path - case does not exists', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: 'not-exist',
        connector_id: connectorId,
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const res = await routeHandler(context, request, kibanaResponseFactory);
    expect(res.status).toEqual(404);
  });

  it('Unhappy path - connector does not exists', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: 'not-exists',
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const res = await routeHandler(context, request, kibanaResponseFactory);
    expect(res.status).toEqual(404);
  });

  it('Unhappy path - cannot push to a closed case', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: 'mock-id-4',
        connector_id: connectorId,
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const res = await routeHandler(context, request, kibanaResponseFactory);
    expect(res.status).toEqual(409);
    expect(res.payload.output.payload.message).toBe(
      'This case Another bad one is closed. You can not pushed if the case is closed.'
    );
  });

  it('Unhappy path - throws when external service returns an error', async () => {
    const request = httpServerMock.createKibanaRequest({
      path,
      method: 'post',
      params: {
        case_id: caseId,
        connector_id: connectorId,
      },
      body: {},
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const actionsClient = context.actions.getActionsClient();
    (actionsClient.execute as jest.Mock).mockResolvedValue({
      status: 'error',
    });

    const res = await routeHandler(context, request, kibanaResponseFactory);
    expect(res.status).toEqual(424);
    expect(res.payload.output.payload.message).toBe('Error pushing to service');
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

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const betterContext = ({
      ...context,
      cases: null,
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

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseMappingsSavedObject: mockCaseMappings,
        caseConfigureSavedObject: mockCaseConfigure,
        caseUserActionsSavedObject: mockUserActions,
      })
    );

    const betterContext = ({
      ...context,
      actions: null,
    } as unknown) as CasesRequestHandlerContext;

    const res = await routeHandler(betterContext, request, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload).toEqual('Action client not found');
  });
});
