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
  mockCasesErrorTriggerData,
  mockCaseComments,
} from '../__fixtures__';
import { initDeleteCasesApi } from './delete_cases';
import { CASES_URL } from '../../../../common';

describe('DELETE case', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initDeleteCasesApi, 'delete');
  });
  it(`deletes the case. responds with 204`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'delete',
      query: {
        ids: ['mock-id-1'],
      },
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(204);
  });
  it(`returns an error when thrown from deleteCase service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'delete',
      query: {
        ids: ['not-real'],
      },
    });

    const mockSO = createMockSavedObjectsRepository({
      caseSavedObject: mockCases,
      caseCommentSavedObject: mockCaseComments,
    });
    // Adding this because the delete API needs to get all the cases first to determine if they are removable or not
    // so it makes a call to bulkGet first
    mockSO.bulkGet.mockImplementation(async () => ({ saved_objects: [] }));

    const { context } = await createRouteContext(mockSO);

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
  it(`returns an error when thrown from getAllCaseComments service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'delete',
      query: {
        ids: ['bad-guy'],
      },
    });

    const mockSO = createMockSavedObjectsRepository({
      caseSavedObject: mockCasesErrorTriggerData,
      caseCommentSavedObject: mockCaseComments,
    });

    // Adding this because the delete API needs to get all the cases first to determine if they are removable or not
    // so it makes a call to bulkGet first
    mockSO.bulkGet.mockImplementation(async () => ({ saved_objects: [] }));

    const { context } = await createRouteContext(mockSO);

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
  it(`returns an error when thrown from deleteComment service`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'delete',
      query: {
        ids: ['valid-id'],
      },
    });

    const mockSO = createMockSavedObjectsRepository({
      caseSavedObject: mockCasesErrorTriggerData,
      caseCommentSavedObject: mockCasesErrorTriggerData,
    });

    // Adding this because the delete API needs to get all the cases first to determine if they are removable or not
    // so it makes a call to bulkGet first
    mockSO.bulkGet.mockImplementation(async () => ({ saved_objects: [] }));

    const { context } = await createRouteContext(mockSO);

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(400);
  });
});
