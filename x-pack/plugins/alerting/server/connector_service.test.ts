/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ConnectorService } from './connector_service';

test('automatically registers default connectors', () => {
  const connectorService = new ConnectorService();
  expect(connectorService.has('console')).toEqual(true);
});

describe('register()', () => {
  test('able to register connectors', () => {
    const executor = jest.fn();
    const connectorService = new ConnectorService();
    connectorService.register({ id: 'my-connector', executor });
  });

  test('throws error if connector already registered', () => {
    const executor = jest.fn();
    const connectorService = new ConnectorService();
    connectorService.register({ id: 'my-connector', executor });
    expect(() =>
      connectorService.register({ id: 'my-connector', executor })
    ).toThrowErrorMatchingInlineSnapshot(`"Connector \\"my-connector\\" is already registered."`);
  });
});

describe('get()', () => {
  test('returns connector', () => {
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      async executor() {},
    });
    const connector = connectorService.get('my-connector');
    expect(connector).toMatchInlineSnapshot(`
Object {
  "executor": [Function],
  "id": "my-connector",
}
`);
  });

  test(`throws an error when connector doesn't exist`, () => {
    const connectorService = new ConnectorService();
    expect(() => connectorService.get('my-connector')).toThrowErrorMatchingInlineSnapshot(
      `"Connector \\"my-connector\\" is not registered."`
    );
  });
});

describe('validateParams()', () => {
  test('should pass when validation not defined', () => {
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      async executor() {},
    });
    connectorService.validateParams('my-connector', {});
  });

  test('should validate and pass when params is valid', () => {
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    connectorService.validateParams('my-connector', { param1: 'value' });
  });

  test('should validate and throw error when params is invalid', () => {
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    expect(() =>
      connectorService.validateParams('my-connector', {})
    ).toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });
});

describe('validateConnectorOptions()', () => {
  test('should pass when validation not defined', () => {
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      async executor() {},
    });
    connectorService.validateConnectorOptions('my-connector', {});
  });

  test('should validate and pass when connectorOptions is valid', () => {
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      validate: {
        connectorOptions: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    connectorService.validateConnectorOptions('my-connector', { param1: 'value' });
  });

  test('should validate and throw error when connectorOptions is invalid', () => {
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      validate: {
        connectorOptions: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    expect(() =>
      connectorService.validateConnectorOptions('my-connector', {})
    ).toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });
});

describe('has()', () => {
  test('returns false for unregistered connectors', () => {
    const connectorService = new ConnectorService();
    expect(connectorService.has('my-connector')).toEqual(false);
  });

  test('returns true for default connectors', () => {
    const connectorService = new ConnectorService();
    expect(connectorService.has('console')).toEqual(true);
    expect(connectorService.has('slack')).toEqual(true);
    expect(connectorService.has('email')).toEqual(true);
  });

  test('returns true after registering a connector', () => {
    const executor = jest.fn();
    const connectorService = new ConnectorService();
    connectorService.register({ id: 'my-connector', executor });
    expect(connectorService.has('my-connector'));
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const executor = jest.fn().mockResolvedValueOnce({ success: true });
    const connectorService = new ConnectorService();
    connectorService.register({ id: 'my-connector', executor });
    await connectorService.execute('my-connector', { foo: true }, { bar: false });
    expect(executor).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "foo": true,
      },
      Object {
        "bar": false,
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

  test('validates params', async () => {
    const executor = jest.fn().mockResolvedValueOnce({ success: true });
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      executor,
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
    });
    await expect(
      connectorService.execute('my-connector', {}, {})
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test('validates connectorOptions', async () => {
    const executor = jest.fn().mockResolvedValueOnce({ success: true });
    const connectorService = new ConnectorService();
    connectorService.register({
      id: 'my-connector',
      executor,
      validate: {
        connectorOptions: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
    });
    await expect(
      connectorService.execute('my-connector', {}, {})
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test('throws error if connector not registered', async () => {
    const connectorService = new ConnectorService();
    await expect(
      connectorService.execute('my-connector', { foo: true }, { bar: false })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Connector \\"my-connector\\" is not registered."`
    );
  });
});
