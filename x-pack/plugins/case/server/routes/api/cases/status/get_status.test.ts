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
} from '../../__fixtures__';
import { initGetCasesStatusApi } from './get_status';
import { CASE_STATUS_URL } from '../../../../../common/constants';

describe('GET status', () => {
  let routeHandler: RequestHandler<any, any, any>;
  const findArgs = {
    fields: [],
    page: 1,
    perPage: 1,
    type: 'cases',
  };

  beforeAll(async () => {
    routeHandler = await createRoute(initGetCasesStatusApi, 'get');
  });

  it(`returns the status`, async () => {
    const request = httpServerMock.createKibanaRequest({
      path: CASE_STATUS_URL,
      method: 'get',
    });

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(theContext.core.savedObjects.client.find).toHaveBeenNthCalledWith(1, {
      ...findArgs,
      filter: 'cases.attributes.status: open',
    });

    expect(theContext.core.savedObjects.client.find).toHaveBeenNthCalledWith(2, {
      ...findArgs,
      filter: 'cases.attributes.status: in-progress',
    });

    expect(theContext.core.savedObjects.client.find).toHaveBeenNthCalledWith(3, {
      ...findArgs,
      filter: 'cases.attributes.status: closed',
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

    const theContext = await createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: [{ ...mockCases[0], id: 'throw-error-find' }],
      })
    );

    const response = await routeHandler(theContext, request, kibanaResponseFactory);
    expect(response.status).toEqual(404);
  });
});
