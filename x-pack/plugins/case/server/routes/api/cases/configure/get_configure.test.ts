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

describe('GET configuration', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initGetCaseConfigure, 'get');
  });

  it('returns the configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: '/api/cases/configure',
      method: 'get',
    });

    const context = createRouteContext(
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
      path: '/api/cases/configure',
      method: 'get',
    });

    const context = createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: [{ ...mockCaseConfigure[0], version: undefined }],
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);
    expect(res.payload).toEqual({
      ...mockCaseConfigure[0].attributes,
      version: '',
    });
  });

  it('returns an empty object when there is no configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: '/api/cases/configure',
      method: 'get',
    });

    const context = createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: [],
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(200);
    expect(res.payload).toEqual({});
  });
});
