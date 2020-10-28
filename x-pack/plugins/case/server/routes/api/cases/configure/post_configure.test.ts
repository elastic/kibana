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
import { initPostCaseConfigure } from './post_configure';
import { newConfiguration } from '../../__mocks__/request_responses';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';
import { ConnectorTypes } from '../../../../../common/api/connectors';

describe('POST configuration', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeAll(async () => {
    routeHandler = await createRoute(initPostCaseConfigure, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2020-04-09T09:43:51.778Z'),
    }));
  });

  it('create configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: newConfiguration,
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
        connector: {
          id: '456',
          name: 'My connector 2',
          type: '.jira',
          fields: null,
        },
        closure_type: 'close-by-pushing',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: 'd00d@awesome.com', full_name: 'Awesome D00d', username: 'awesome' },
        updated_at: null,
        updated_by: null,
      })
    );
  });

  it('create configuration without authentication', async () => {
    routeHandler = await createRoute(initPostCaseConfigure, 'post', true);

    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: newConfiguration,
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
        connector: {
          id: '456',
          name: 'My connector 2',
          type: '.jira',
          fields: null,
        },
        closure_type: 'close-by-pushing',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: null, full_name: null, username: null },
        updated_at: null,
        updated_by: null,
      })
    );
  });

  it('throws when missing connector.id', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        connector: {
          name: 'My connector 2',
          type: '.jira',
          fields: null,
        },
        closure_type: 'close-by-pushing',
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('throws when missing connector.name', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        connector: {
          id: '456',
          type: '.jira',
          fields: null,
        },
        closure_type: 'close-by-pushing',
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('throws when missing connector.type', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        connector: {
          id: '456',
          name: 'My connector 2',
          fields: null,
        },
        closure_type: 'close-by-pushing',
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('throws when missing connector.fields', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        connector: {
          id: '456',
          name: 'My connector 2',
          type: ConnectorTypes.none,
        },
        closure_type: 'close-by-pushing',
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('throws when missing closure_type', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        connector: {
          id: '456',
          name: 'My connector 2',
          type: '.jira',
          fields: null,
        },
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('it deletes the previous configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: newConfiguration,
    });

    const savedObjectRepository = createMockSavedObjectsRepository({
      caseConfigureSavedObject: mockCaseConfigure,
    });

    const context = await createRouteContext(savedObjectRepository);

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(200);
    expect(savedObjectRepository.delete.mock.calls[0][1]).toBe(mockCaseConfigure[0].id);
  });

  it('it does NOT delete when not found', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: newConfiguration,
    });

    const savedObjectRepository = createMockSavedObjectsRepository({
      caseConfigureSavedObject: [],
    });

    const context = await createRouteContext(savedObjectRepository);

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(200);
    expect(savedObjectRepository.delete).not.toHaveBeenCalled();
  });

  it('it deletes all configuration', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: newConfiguration,
    });

    const savedObjectRepository = createMockSavedObjectsRepository({
      caseConfigureSavedObject: [
        mockCaseConfigure[0],
        { ...mockCaseConfigure[0], id: 'mock-configuration-2' },
      ],
    });

    const context = await createRouteContext(savedObjectRepository);

    const res = await routeHandler(context, req, kibanaResponseFactory);

    expect(res.status).toEqual(200);
    expect(savedObjectRepository.delete.mock.calls[0][1]).toBe(mockCaseConfigure[0].id);
    expect(savedObjectRepository.delete.mock.calls[1][1]).toBe('mock-configuration-2');
  });

  it('returns an error if find throws an error', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: newConfiguration,
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

  it('returns an error if delete throws an error', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: newConfiguration,
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: [{ ...mockCaseConfigure[0], id: 'throw-error-delete' }],
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(500);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('returns an error if post throws an error', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        connector: {
          id: 'throw-error-create',
          name: 'My connector 2',
          fields: null,
        },
        closure_type: 'close-by-pushing',
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('handles undefined version correctly', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        ...newConfiguration,
        connector: {
          id: 'no-version',
          name: 'no version',
          type: ConnectorTypes.none,
          fields: null,
        },
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
        version: '',
      })
    );
  });

  it('returns an error if fields are not null', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        ...newConfiguration,
        connector: { id: 'not-null', name: 'not-null', type: ConnectorTypes.none, fields: {} },
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });

  it('returns an error if the type of the connector does not exists', async () => {
    const req = httpServerMock.createKibanaRequest({
      path: CASE_CONFIGURE_URL,
      method: 'post',
      body: {
        ...newConfiguration,
        connector: { id: 'not-exists', name: 'not-exist', type: '.not-exists', fields: null },
      },
    });

    const context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseConfigureSavedObject: mockCaseConfigure,
      })
    );

    const res = await routeHandler(context, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toEqual(true);
  });
});
