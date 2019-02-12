/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { CANVAS_TYPE, API_ROUTE_WORKPAD } from '../../common/lib/constants';
import { workpad } from './workpad';

describe(`${CANVAS_TYPE} API`, () => {
  const savedObjectsClient = {
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  afterEach(() => {
    savedObjectsClient.get.mockReset();
    savedObjectsClient.create.mockReset();
    savedObjectsClient.delete.mockReset();
    savedObjectsClient.find.mockReset();
  });

  const mockServer = new Hapi.Server({ debug: false, port: 0 });
  mockServer.plugins = {
    elasticsearch: {
      getCluster: () => ({
        errors: {
          // formatResponse will fail without objects here
          '400': Error,
          '401': Error,
          '403': Error,
          '404': Error,
        },
      }),
    },
  };
  mockServer.ext('onRequest', (req, h) => {
    req.getSavedObjectsClient = () => savedObjectsClient;
    return h.continue;
  });
  workpad(mockServer);

  describe(`GET ${API_ROUTE_WORKPAD}/{id}`, () => {
    test('returns successful response', async () => {
      const request = {
        method: 'GET',
        url: `${API_ROUTE_WORKPAD}/123`,
      };

      savedObjectsClient.get.mockResolvedValueOnce({ id: '123', attributes: { foo: true } });

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "foo": true,
  "id": "123",
}
`);
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get.mock.calls[0]).toEqual([CANVAS_TYPE, '123']);
    });
  });

  describe(`POST ${API_ROUTE_WORKPAD}`, () => {
    test('returns successful response without id in payload', async () => {
      const request = {
        method: 'POST',
        url: API_ROUTE_WORKPAD,
        payload: {
          foo: true,
        },
      };

      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.create.mock.calls[0][0]).toEqual(CANVAS_TYPE);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('id', undefined);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('foo', true);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('@timestamp');
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('@created');
      expect(savedObjectsClient.create.mock.calls[0][2]).toHaveProperty('id');
    });

    test('returns succesful response with id in payload', async () => {
      const request = {
        method: 'POST',
        url: API_ROUTE_WORKPAD,
        payload: {
          id: '123',
          foo: true,
        },
      };

      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.create.mock.calls[0][0]).toEqual(CANVAS_TYPE);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('id', undefined);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('foo', true);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('@timestamp');
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('@created');
      expect(savedObjectsClient.create.mock.calls[0][2]).toHaveProperty('id', '123');
    });
  });

  describe(`PUT ${API_ROUTE_WORKPAD}/{id}`, () => {
    test('formats successful response', async () => {
      const request = {
        method: 'PUT',
        url: `${API_ROUTE_WORKPAD}/123`,
        payload: {
          id: '234',
          foo: true,
        },
      };

      savedObjectsClient.get.mockResolvedValueOnce({
        attributes: {
          '@created': new Date().toISOString(),
        },
      });
      savedObjectsClient.create.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get.mock.calls[0]).toEqual([CANVAS_TYPE, '123']);
      expect(savedObjectsClient.create.mock.calls[0][0]).toEqual(CANVAS_TYPE);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('id', undefined);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('foo', true);
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('@timestamp');
      expect(savedObjectsClient.create.mock.calls[0][1]).toHaveProperty('@created');
      expect(savedObjectsClient.create.mock.calls[0][2]).toHaveProperty('id', '123');
      expect(savedObjectsClient.create.mock.calls[0][2]).toHaveProperty('overwrite', true);
    });
  });

  describe(`DELETE ${API_ROUTE_WORKPAD}/{id}`, () => {
    test('formats successful response', async () => {
      const request = {
        method: 'DELETE',
        url: `${API_ROUTE_WORKPAD}/123`,
      };

      savedObjectsClient.delete.mockResolvedValueOnce({});

      const { payload, statusCode } = await mockServer.inject(request);
      const response = JSON.parse(payload);

      expect(statusCode).toBe(200);
      expect(response).toMatchInlineSnapshot(`
Object {
  "ok": true,
}
`);
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.delete.mock.calls[0]).toEqual([CANVAS_TYPE, '123']);
    });
  });

  describe(`GET ${API_ROUTE_WORKPAD}/find`, async () => {
    const request = {
      method: 'GET',
      url: `${API_ROUTE_WORKPAD}/find?name=abc&page=2&perPage=10`,
    };

    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          attributes: {
            foo: true,
          },
        },
      ],
    });

    const { payload, statusCode } = await mockServer.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toMatchInlineSnapshot(`
Object {
  "workpads": Array [
    Object {
      "foo": true,
      "id": "1",
    },
  ],
}
`);
  });
});
