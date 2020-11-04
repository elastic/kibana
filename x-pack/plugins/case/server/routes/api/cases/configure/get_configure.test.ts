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
} from '../../__fixtures__';

import { mockCaseConfigure } from '../../__fixtures__/mock_saved_objects';
import { initGetCaseConfigure } from './get_configure';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';

describe('GET configuration', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initGetCaseConfigure, 'get');
  });

  it('returns the configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'get',
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);
    expect(res.payload).toEqual({
      ...mockCaseConfigure[0].attributes,
      version: mockCaseConfigure[0].version,
    });
  });

  it('handles undefined version correctly', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'get',
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: [{ ...mockCaseConfigure[0], version: undefined }],
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);
    expect(res.payload).toEqual({
      connector: {
        id: '789',
        name: 'My connector 3',
        type: '.jira',
        fields: null,
      },
      closure_type: 'close-by-user',
      created_at: '2020-04-09T09:43:51.778Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      updated_at: '2020-04-09T09:43:51.778Z',
      updated_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      version: '',
    });
  });

  it('returns an empty object when there is no configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'get',
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: [],
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);

    expect(res.payload).toEqual({});
  });

  it('returns an error if find throws an error', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'get',
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: [{ ...mockCaseConfigure[0], id: 'throw-error-find' }],
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(404);
    expect(res.payload.isBoom).toEqual(true);
  });
});
