/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ActionTypeRegistry } from '../action_type_registry';

const services = {
  log: jest.fn(),
};
const actionTypeRegistryParams = {
  services,
};

describe('register()', () => {
  test('able to register action types', () => {
    const executor = jest.fn();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type')).toEqual(true);
  });

  test('throws error if action type already registered', () => {
    const executor = jest.fn();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(() =>
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        executor,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionType = actionTypeRegistry.get('my-action-type');
    expect(actionType).toMatchInlineSnapshot(`
Object {
  "executor": [Function],
  "id": "my-action-type",
  "name": "My action type",
}
`);
  });

  test(`throws an error when action type doesn't exist`, () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    expect(() => actionTypeRegistry.get('my-action-type')).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is not registered."`
    );
  });
});

describe('getUnencryptedAttributes()', () => {
  test('returns empty array when unencryptedAttributes is undefined', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const result = actionTypeRegistry.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual([]);
  });

  test('returns values inside unencryptedAttributes array when it exists', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'b', 'c'],
      async executor() {},
    });
    const result = actionTypeRegistry.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionTypes = actionTypeRegistry.list();
    expect(actionTypes).toEqual([
      {
        id: 'my-action-type',
        name: 'My action type',
      },
    ]);
  });
});

describe('validateParams()', () => {
  test('should pass when validation not defined', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    actionTypeRegistry.validateParams('my-action-type', {});
  });

  test('should validate and pass when params is valid', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      validate: {
        params: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    actionTypeRegistry.validateParams('my-action-type', { param1: 'value' });
  });

  test('should validate and throw error when params is invalid', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
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
      actionTypeRegistry.validateParams('my-action-type', {})
    ).toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });
});

describe('validateActionTypeConfig()', () => {
  test('should pass when validation not defined', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    actionTypeRegistry.validateActionTypeConfig('my-action-type', {});
  });

  test('should validate and pass when actionTypeConfig is valid', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      validate: {
        actionTypeConfig: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    actionTypeRegistry.validateActionTypeConfig('my-action-type', { param1: 'value' });
  });

  test('should validate and throw error when actionTypeConfig is invalid', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      validate: {
        actionTypeConfig: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
      async executor() {},
    });
    expect(() =>
      actionTypeRegistry.validateActionTypeConfig('my-action-type', {})
    ).toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });
});

describe('has()', () => {
  test('returns false for unregistered action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    expect(actionTypeRegistry.has('my-action-type')).toEqual(false);
  });

  test('returns true after registering an action type', () => {
    const executor = jest.fn();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type'));
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const executor = jest.fn().mockResolvedValueOnce({ success: true });
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    await actionTypeRegistry.execute({
      id: 'my-action-type',
      actionTypeConfig: { foo: true },
      params: { bar: false },
    });
    expect(executor).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "actionTypeConfig": Object {
          "foo": true,
        },
        "params": Object {
          "bar": false,
        },
        "services": Object {
          "log": [MockFunction],
        },
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
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
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
      actionTypeRegistry.execute({
        id: 'my-action-type',
        actionTypeConfig: {},
        params: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test('validates actionTypeConfig', async () => {
    const executor = jest.fn().mockResolvedValueOnce({ success: true });
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
      validate: {
        actionTypeConfig: Joi.object()
          .keys({
            param1: Joi.string().required(),
          })
          .required(),
      },
    });
    await expect(
      actionTypeRegistry.execute({
        id: 'my-action-type',
        actionTypeConfig: {},
        params: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test('throws error if action type not registered', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    await expect(
      actionTypeRegistry.execute({
        id: 'my-action-type',
        actionTypeConfig: { foo: true },
        params: { bar: false },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is not registered."`
    );
  });
});
