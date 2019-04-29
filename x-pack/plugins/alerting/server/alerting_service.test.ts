/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingService } from './alerting_service';

describe('#AlertingService', () => {
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

  test('automatically registers default connectors', () => {
    const alerting = new AlertingService();
    expect(alerting.hasConnector('console')).toEqual(true);
  });

  describe('registerConnector()', () => {
    test('able to register connectors', () => {
      const executor = jest.fn();
      const alerting = new AlertingService();
      alerting.registerConnector('my-connector', executor);
    });

    test('throws error if connector already registered', () => {
      const executor = jest.fn();
      const alerting = new AlertingService();
      alerting.registerConnector('my-connector', executor);
      expect(() =>
        alerting.registerConnector('my-connector', executor)
      ).toThrowErrorMatchingInlineSnapshot(`"Connector \\"my-connector\\" is already registered"`);
    });
  });

  describe('hasConnector()', () => {
    test('returns true for default connectors', () => {
      const alerting = new AlertingService();
      expect(alerting.hasConnector('console')).toEqual(true);
    });

    test('returns true after registering a connector', () => {
      const executor = jest.fn();
      const alerting = new AlertingService();
      alerting.registerConnector('my-connector', executor);
      expect(alerting.hasConnector('my-connector')).toEqual(true);
    });

    test('returns false for unregistered connectors', () => {
      const alerting = new AlertingService();
      expect(alerting.hasConnector('my-connector')).toEqual(false);
    });
  });

  describe('createAction()', () => {
    test('creates an action with all given properties', async () => {
      const expectedResult = Symbol();
      const alerting = new AlertingService();
      savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
      const result = await alerting.createAction(savedObjectsClient, {
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
      const alerting = new AlertingService();
      await expect(
        alerting.createAction(savedObjectsClient, {
          id: 'my-alert',
          description: 'my description',
          connectorId: 'unregistered-connector',
          connectorOptions: {},
          connectorOptionsSecrets: {},
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Connector \\"unregistered-connector\\" is not registered"`
      );
    });
  });

  describe('fireAction()', () => {
    test('fires an action with all given parameters', async () => {
      const alerting = new AlertingService();
      const mockConnector = jest.fn().mockReturnValueOnce({ success: true });
      alerting.registerConnector('mock', mockConnector);
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
      const result = await alerting.fireAction({
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
      "value": Object {
        "success": true,
      },
    },
  ],
}
`);
      expect(savedObjectsClient.get.mock.calls).toEqual([['action', 'mock-action']]);
    });

    test(`throws an error when the connector isn't registered`, async () => {
      const alerting = new AlertingService();
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
        alerting.fireAction({ savedObjectsClient, id: 'mock-action', params: { baz: false } })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Connector \\"non-registered-connector\\" is not registered"`
      );
    });
  });
});
