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
import { initPatchCaseConfigure } from './patch_configure';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';
import { ConnectorTypes } from '../../../../../common/api/connectors';

describe('PATCH configuration', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeAll(async () => {
    routeHandler = await createRoute(initPatchCaseConfigure, 'patch');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2020-04-09T09:43:51.778Z'),
    }));
  });

  it('patch configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'patch',
      body: {
        closure_type: 'close-by-pushing',
        version: mockCaseConfigure[0].version,
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(200);
    expect(res.payload).toEqual(
      expect.objectContaining({
        ...mockCaseConfigure[0].attributes,
        connector: { fields: null, id: '789', name: 'My connector 3', type: '.jira' },
        closure_type: 'close-by-pushing',
        updated_at: '2020-04-09T09:43:51.778Z',
        updated_by: { email: 'd00d@awesome.com', full_name: 'Awesome D00d', username: 'awesome' },
        version: 'WzE3LDFd',
      })
    );
  });

  it('patch configuration without authentication', async () => {
    routeHandler = await createRoute(initPatchCaseConfigure, 'patch', true);

    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'patch',
      body: {
        closure_type: 'close-by-pushing',
        version: mockCaseConfigure[0].version,
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(200);
    expect(res.payload).toEqual(
      expect.objectContaining({
        ...mockCaseConfigure[0].attributes,
        connector: { fields: null, id: '789', name: 'My connector 3', type: '.jira' },
        closure_type: 'close-by-pushing',
        updated_at: '2020-04-09T09:43:51.778Z',
        updated_by: { email: null, full_name: null, username: null },
        version: 'WzE3LDFd',
      })
    );
  });

  it('patch configuration - connector', async () => {
    routeHandler = await createRoute(initPatchCaseConfigure, 'patch');

    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'patch',
      body: {
        connector: {
          id: 'connector-new',
          name: 'New connector',
          type: '.jira',
          fields: null,
        },
        version: mockCaseConfigure[0].version,
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(200);
    expect(res.payload).toEqual(
      expect.objectContaining({
        ...mockCaseConfigure[0].attributes,
        connector: { id: 'connector-new', name: 'New connector', type: '.jira', fields: null },
        closure_type: 'close-by-user',
        updated_at: '2020-04-09T09:43:51.778Z',
        updated_by: { email: 'd00d@awesome.com', full_name: 'Awesome D00d', username: 'awesome' },
        version: 'WzE3LDFd',
      })
    );
  });

  it('throw error when configuration have not being created', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'patch',
      body: {
        closure_type: 'close-by-pushing',
        version: mockCaseConfigure[0].version,
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: [],
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(409);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('throw error when the versions are different', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'patch',
      body: {
        closure_type: 'close-by-pushing',
        version: 'different-version',
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(409);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('handles undefined version correctly', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'patch',
      body: {
        connector: {
          id: 'no-version',
          name: 'no version',
          type: ConnectorTypes.none,
          fields: null,
        },
        version: mockCaseConfigure[0].version,
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.payload).toEqual(
      expect.objectContaining({
        version: '',
      })
    );
  });
});
