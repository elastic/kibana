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
  mockCaseConfigure,
  mockCaseMappings,
} from '../../__fixtures__';

import { initCaseConfigureGetActionConnector } from './get_connectors';
import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../../common/constants';
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

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
        caseMappingsSavedObject: mockCaseMappings,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);

    const expected = getActions();
    expected.shift();
    expect(res.payload).toEqual(expected);
  });

  it('it throws an error when actions client is null', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
      method: 'get',
    });

    const context = await createRouteContext(
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
