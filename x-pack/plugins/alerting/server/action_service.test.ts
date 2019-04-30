/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorService } from './connector_service';
import { ActionService } from './action_service';

const savedObjectsClient = {
  errors: {} as any,
  bulkCreate: jest.fn(),
  bulkGet: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
};

beforeEach(() => jest.resetAllMocks());

describe('create()', () => {
  test('creates an action with all given properties', async () => {
    const expectedResult = Symbol();
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionService.create(savedObjectsClient, {
      id: 'my-alert',
      description: 'my description',
      connectorId: 'console',
      connectorOptions: {},
      connectorOptionsSecrets: {},
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.create).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      Object {
        "connectorId": "console",
        "connectorOptions": Object {},
        "connectorOptionsSecrets": Object {},
        "description": "my description",
      },
      Object {
        "id": "my-alert",
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": Promise {},
    },
  ],
}
`);
  });

  test(`throws an error when connector doesn't exist`, async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    await expect(
      actionService.create(savedObjectsClient, {
        id: 'my-alert',
        description: 'my description',
        connectorId: 'unregistered-connector',
        connectorOptions: {},
        connectorOptionsSecrets: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Connector \\"unregistered-connector\\" is not registered."`
    );
  });
});

describe('get()', () => {
  test('calls savedObjectsClient with id', async () => {
    const expectedResult = Symbol();
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    savedObjectsClient.get.mockResolvedValueOnce(expectedResult);
    const result = await actionService.get(savedObjectsClient, '1');
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.get).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      "1",
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": Promise {},
    },
  ],
}
`);
  });
});

describe('fire()', () => {
  test('fires an action with all given parameters', async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    const mockConnector = jest.fn().mockResolvedValueOnce({ success: true });
    connectorService.register({ id: 'mock', executor: mockConnector });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: 'mock-action',
      attributes: {
        connectorId: 'mock',
        connectorOptions: {
          foo: true,
        },
        connectorOptionsSecrets: {
          bar: false,
        },
      },
    });
    const result = await actionService.fire({
      id: 'mock-action',
      params: { baz: false },
      savedObjectsClient,
    });
    expect(result).toEqual({ success: true });
    expect(mockConnector).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "bar": false,
        "foo": true,
      },
      Object {
        "baz": false,
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": Promise {},
    },
  ],
}
`);
    expect(savedObjectsClient.get.mock.calls).toEqual([['action', 'mock-action']]);
  });

  test(`throws an error when the connector isn't registered`, async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    savedObjectsClient.get.mockResolvedValueOnce({
      id: 'mock-action',
      attributes: {
        connectorId: 'non-registered-connector',
        connectorOptions: {
          foo: true,
        },
        connectorOptionsSecrets: {
          bar: false,
        },
      },
    });
    await expect(
      actionService.fire({ savedObjectsClient, id: 'mock-action', params: { baz: false } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Connector \\"non-registered-connector\\" is not registered."`
    );
  });
});
