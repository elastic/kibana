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
} from '../../__fixtures__';
import { initGetCasesStatusApi } from './get_status';
import { CASE_STATUS_URL } from '../../../../../common';
import { CaseType } from '../../../../../common';

describe('GET status', () => {
  let routeHandler: RequestHandler<any, any, any>;
  const findArgs = {
    fields: [],
    page: 1,
    perPage: 1,
    type: 'cases',
    sortField: 'created_at',
  };

  beforeAll(async () => {
    routeHandler = await createRoute(initGetCasesStatusApi, 'get');
  });

  it(`returns the status`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_STATUS_URL,
      method: 'get',
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(context.core.savedObjects.client.find).toHaveBeenNthCalledWith(1, {
      ...findArgs,
      filter: `((cases.attributes.status: open AND cases.attributes.type: individual) OR cases.attributes.type: ${CaseType.collection})`,
    });

    expect(context.core.savedObjects.client.find).toHaveBeenNthCalledWith(2, {
      ...findArgs,
      filter: `((cases.attributes.status: in-progress AND cases.attributes.type: individual) OR cases.attributes.type: ${CaseType.collection})`,
    });

    expect(context.core.savedObjects.client.find).toHaveBeenNthCalledWith(3, {
      ...findArgs,
      filter: `((cases.attributes.status: closed AND cases.attributes.type: individual) OR cases.attributes.type: ${CaseType.collection})`,
    });

    expect(response.payload).toEqual({
      count_open_cases: 4,
      count_in_progress_cases: 4,
      count_closed_cases: 4,
    });
  });

  it(`returns an error when findCases throws`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_STATUS_URL,
      method: 'get',
    });

    const { context } = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: [{ ...mockCases[0], id: 'throw-error-find' }],
      })
    );

    const response = await routeHandler(context, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
});
