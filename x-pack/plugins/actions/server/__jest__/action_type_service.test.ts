/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ActionTypeService } from '../action_type_service';

describe('register()', () => {
  test('able to register action types', () => {
    const executor = jest.fn();
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeService.has('my-action-type')).toEqual(true);
  });

  test('throws error if action type already registered', () => {
    const executor = jest.fn();
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(() =>
      actionTypeService.register({
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
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionType = actionTypeService.get('my-action-type');
    expect(actionType).toMatchInlineSnapshot(`
Object {
  "executor": [Function],
  "id": "my-action-type",
  "name": "My action type",
}
`);
  });

  test(`throws an error when action type doesn't exist`, () => {
    const actionTypeService = new ActionTypeService();
    expect(() => actionTypeService.get('my-action-type')).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is not registered."`
    );
  });
});

describe('getUnencryptedAttributes()', () => {
  test('returns empty array when unencryptedAttributes is undefined', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const result = actionTypeService.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual([]);
  });

  test('returns values inside unencryptedAttributes array when it exists', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'b', 'c'],
      async executor() {},
    });
    const result = actionTypeService.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionTypes = actionTypeService.list();
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
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    actionTypeService.validateParams('my-action-type', {});
  });

  test('should validate and pass when params is valid', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
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
    actionTypeService.validateParams('my-action-type', { param1: 'value' });
  });

  test('should validate and throw error when params is invalid', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
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
      actionTypeService.validateParams('my-action-type', {})
    ).toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });
});

describe('validateActionTypeConfig()', () => {
  test('should pass when validation not defined', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    actionTypeService.validateActionTypeConfig('my-action-type', {});
  });

  test('should validate and pass when actionTypeConfig is valid', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
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
    actionTypeService.validateActionTypeConfig('my-action-type', { param1: 'value' });
  });

  test('should validate and throw error when actionTypeConfig is invalid', () => {
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
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
      actionTypeService.validateActionTypeConfig('my-action-type', {})
    ).toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });
});

describe('has()', () => {
  test('returns false for unregistered action types', () => {
    const actionTypeService = new ActionTypeService();
    expect(actionTypeService.has('my-action-type')).toEqual(false);
  });

  test('returns true after registering an action type', () => {
    const executor = jest.fn();
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeService.has('my-action-type'));
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const executor = jest.fn().mockResolvedValueOnce({ success: true });
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    await actionTypeService.execute({
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
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
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
      actionTypeService.execute({
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
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
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
      actionTypeService.execute({
        id: 'my-action-type',
        actionTypeConfig: {},
        params: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test('throws error if action type not registered', async () => {
    const actionTypeService = new ActionTypeService();
    await expect(
      actionTypeService.execute({
        id: 'my-action-type',
        actionTypeConfig: { foo: true },
        params: { bar: false },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is not registered."`
    );
  });
});
