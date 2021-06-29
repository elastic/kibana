/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from '@commercial/hapi';

jest.mock('../lib/es_version_precheck');

const mockAddDefaultField = jest.fn();
jest.mock('../lib/query_default_field', () => ({
  addDefaultField: mockAddDefaultField,
}));

import { registerQueryDefaultFieldRoutes } from './query_default_field';

const callWithRequest = jest.fn();

const server = new Server();
server.plugins = {
  elasticsearch: {
    getCluster: () => ({ callWithRequest } as any),
  } as any,
} as any;
server.config = () => ({ get: () => '' } as any);

registerQueryDefaultFieldRoutes(server);

describe('add query default field API', () => {
  beforeEach(() => {
    mockAddDefaultField.mockClear();
  });

  it('calls addDefaultField with index, field types, and other fields', async () => {
    mockAddDefaultField.mockResolvedValueOnce({ acknowledged: true });
    const resp = await server.inject({
      method: 'POST',
      url: '/api/upgrade_assistant/add_query_default_field/myIndex',
      payload: {
        fieldTypes: ['text', 'boolean'],
        otherFields: ['myCustomField'],
      },
    });

    expect(mockAddDefaultField).toHaveBeenCalledWith(
      callWithRequest,
      expect.anything(),
      'myIndex',
      new Set(['text', 'boolean']),
      new Set(['myCustomField'])
    );
    expect(resp.statusCode).toEqual(200);
    expect(resp.payload).toMatchInlineSnapshot(`"{\\"acknowledged\\":true}"`);
  });

  it('calls addDefaultField with index, field types if other fields is not specified', async () => {
    mockAddDefaultField.mockResolvedValueOnce({ acknowledged: true });
    const resp = await server.inject({
      method: 'POST',
      url: '/api/upgrade_assistant/add_query_default_field/myIndex',
      payload: {
        fieldTypes: ['text', 'boolean'],
      },
    });

    expect(mockAddDefaultField).toHaveBeenCalledWith(
      callWithRequest,
      expect.anything(),
      'myIndex',
      new Set(['text', 'boolean']),
      undefined
    );
    expect(resp.statusCode).toEqual(200);
    expect(resp.payload).toMatchInlineSnapshot(`"{\\"acknowledged\\":true}"`);
  });

  it('fails if fieldTypes is not specified', async () => {
    const resp = await server.inject({
      method: 'POST',
      url: '/api/upgrade_assistant/add_query_default_field/myIndex',
    });

    expect(mockAddDefaultField).not.toHaveBeenCalled();
    expect(resp.statusCode).toEqual(400);
  });
});
