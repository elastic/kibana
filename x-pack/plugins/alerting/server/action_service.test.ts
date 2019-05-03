/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
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
    connectorService.register({
      id: 'my-connector',
      name: 'My connector',
      async executor() {},
    });
    const actionService = new ActionService(connectorService);
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionService.create(
      savedObjectsClient,
      {
        description: 'my description',
        connectorId: 'my-connector',
        connectorOptions: {},
      },
      { id: 'my-alert' }
    );
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.create).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      Object {
        "connectorId": "my-connector",
        "connectorOptions": Object {},
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

  test('validates connectorOptions', async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    connectorService.register({
      id: 'my-connector',
      name: 'My connector',
      validate: {
        connectorOptions: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    await expect(
      actionService.create(
        savedObjectsClient,
        {
          description: 'my description',
          connectorId: 'my-connector',
          connectorOptions: {},
        },
        { id: 'my-alert' }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test(`throws an error when connector doesn't exist`, async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    await expect(
      actionService.create(
        savedObjectsClient,
        {
          description: 'my description',
          connectorId: 'unregistered-connector',
          connectorOptions: {},
        },
        { id: 'my-alert' }
      )
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

describe('find()', () => {
  test('calls savedObjectsClient with parameters', async () => {
    const expectedResult = Symbol();
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    savedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    const result = await actionService.find(savedObjectsClient, {});
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.find).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "type": "action",
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
});

describe('delete()', () => {
  test('calls savedObjectsClient with id', async () => {
    const expectedResult = Symbol();
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    savedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
    const result = await actionService.delete(savedObjectsClient, '1');
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.delete).toMatchInlineSnapshot(`
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

describe('update()', () => {
  test('updates an action with all given properties', async () => {
    const expectedResult = Symbol();
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      name: 'My connector',
      async executor() {},
    });
    const actionService = new ActionService(connectorService);
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionService.update(savedObjectsClient, 'my-alert', {
      description: 'my description',
      connectorId: 'my-connector',
      connectorOptions: {},
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.update).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      "my-alert",
      Object {
        "connectorId": "my-connector",
        "connectorOptions": Object {},
        "description": "my description",
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

  test('validates connectorOptions', async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    connectorService.register({
      id: 'my-connector',
      name: 'My connector',
      validate: {
        connectorOptions: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    await expect(
      actionService.update(savedObjectsClient, 'my-alert', {
        description: 'my description',
        connectorId: 'my-connector',
        connectorOptions: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test(`throws an error when connector doesn't exist`, async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    await expect(
      actionService.update(savedObjectsClient, 'my-alert', {
        description: 'my description',
        connectorId: 'unregistered-connector',
        connectorOptions: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Connector \\"unregistered-connector\\" is not registered."`
    );
  });
});

describe('fire()', () => {
  test('fires an action with all given parameters', async () => {
    const connectorService = new ConnectorService();
    const actionService = new ActionService(connectorService);
    const mockConnector = jest.fn().mockResolvedValueOnce({ success: true });
    connectorService.register({
      id: 'mock',
      name: 'Mock',
      executor: mockConnector,
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: 'mock-action',
      attributes: {
        connectorId: 'mock',
        connectorOptions: {
          foo: true,
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
      },
    });
    await expect(
      actionService.fire({ savedObjectsClient, id: 'mock-action', params: { baz: false } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Connector \\"non-registered-connector\\" is not registered."`
    );
  });
});
