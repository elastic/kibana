/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { mockAddDefaultField } from './query_default_field.test.mocks';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import { registerQueryDefaultFieldRoutes } from './query_default_field';

describe('add query default field API', () => {
  let dependencies: any;

  beforeEach(() => {
    dependencies = {
      router: createMockRouter(),
    };
    mockAddDefaultField.mockClear();
    registerQueryDefaultFieldRoutes(dependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls addDefaultField with index, field types, and other fields', async () => {
    mockAddDefaultField.mockResolvedValueOnce({ acknowledged: true });
    const resp = await dependencies.router.getHandler({
      method: 'post',
      pathPattern: '/api/upgrade_assistant/add_query_default_field/{indexName}',
    })(
      routeHandlerContextMock,
      createRequestMock({
        params: { indexName: 'myIndex' },
        body: {
          fieldTypes: ['text', 'boolean'],
          otherFields: ['myCustomField'],
        },
      }),
      kibanaResponseFactory
    );

    expect(mockAddDefaultField).toHaveBeenCalledWith(
      routeHandlerContextMock.core.elasticsearch.legacy.client,
      'myIndex',
      new Set(['text', 'boolean']),
      new Set(['myCustomField'])
    );
    expect(resp.status).toEqual(200);
    expect(resp.payload).toEqual({ acknowledged: true });
  });

  it('calls addDefaultField with index, field types if other fields is not specified', async () => {
    mockAddDefaultField.mockResolvedValueOnce({ acknowledged: true });
    const resp = await dependencies.router.getHandler({
      method: 'post',
      pathPattern: '/api/upgrade_assistant/add_query_default_field/{indexName}',
    })(
      routeHandlerContextMock,
      createRequestMock({
        params: { indexName: 'myIndex' },
        body: {
          fieldTypes: ['text', 'boolean'],
        },
      }),
      kibanaResponseFactory
    );

    expect(mockAddDefaultField).toHaveBeenCalledWith(
      routeHandlerContextMock.core.elasticsearch.legacy.client,
      'myIndex',
      new Set(['text', 'boolean']),
      undefined
    );
    expect(resp.status).toEqual(200);
    expect(resp.payload).toEqual({ acknowledged: true });
  });
});
