/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ActionTypeRegistry } from '../action_type_registry';
import { ActionsClient } from '../actions_client';

const services = {
  log: jest.fn(),
};
const actionTypeRegistryParams = {
  services,
};

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
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.create({
      data: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {},
      },
      options: {
        migrationVersion: {},
        references: [],
      },
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.create).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      Object {
        "actionTypeConfig": Object {},
        "actionTypeConfigSecrets": Object {},
        "actionTypeId": "my-action-type",
        "description": "my description",
      },
      Object {
        "migrationVersion": Object {},
        "references": Array [],
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

  test('validates actionTypeConfig', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
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
    await expect(
      actionsClient.create({
        data: {
          description: 'my description',
          actionTypeId: 'my-action-type',
          actionTypeConfig: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test(`throws an error when an action type doesn't exist`, async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    await expect(
      actionsClient.create({
        data: {
          description: 'my description',
          actionTypeId: 'unregistered-action-type',
          actionTypeConfig: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const expectedResult = Symbol();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.create({
      data: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {
          a: true,
          b: true,
          c: true,
        },
      },
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.create).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      Object {
        "actionTypeConfig": Object {
          "a": true,
          "c": true,
        },
        "actionTypeConfigSecrets": Object {
          "b": true,
        },
        "actionTypeId": "my-action-type",
        "description": "my description",
      },
      undefined,
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

describe('get()', () => {
  test('calls savedObjectsClient with id', async () => {
    const expectedResult = Symbol();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.get({ id: '1' });
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
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.find({});
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
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.delete({ id: '1' });
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
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.update({
      id: 'my-action',
      data: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {},
      },
      options: {},
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.update).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      "my-action",
      Object {
        "actionTypeConfig": Object {},
        "actionTypeConfigSecrets": Object {},
        "actionTypeId": "my-action-type",
        "description": "my description",
      },
      Object {},
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

  test('validates actionTypeConfig', async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
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
    await expect(
      actionsClient.update({
        id: 'my-action',
        data: {
          description: 'my description',
          actionTypeId: 'my-action-type',
          actionTypeConfig: {},
        },
        options: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test(`throws an error when action type doesn't exist`, async () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    await expect(
      actionsClient.update({
        id: 'my-action',
        data: {
          description: 'my description',
          actionTypeId: 'unregistered-action-type',
          actionTypeConfig: {},
        },
        options: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const expectedResult = Symbol();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionsClient = new ActionsClient({
      actionTypeRegistry,
      savedObjectsClient,
    });
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.update({
      id: 'my-action',
      data: {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {
          a: true,
          b: true,
          c: true,
        },
      },
      options: {},
    });
    expect(result).toEqual(expectedResult);
    expect(savedObjectsClient.update).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      "my-action",
      Object {
        "actionTypeConfig": Object {
          "a": true,
          "c": true,
        },
        "actionTypeConfigSecrets": Object {
          "b": true,
        },
        "actionTypeId": "my-action-type",
        "description": "my description",
      },
      Object {},
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
