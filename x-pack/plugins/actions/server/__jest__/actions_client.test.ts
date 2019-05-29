/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ActionTypeService } from '../action_type_service';
import { ActionsClient } from '../actions_client';
import { TaskManager } from '../../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';

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

const mockTaskManager = {
  registerTaskDefinitions: jest.fn() as TaskManager['registerTaskDefinitions'],
} as TaskManager;

const mockEncryptedSavedObjectsPlugin = {
  getDecryptedAsInternalUser: jest.fn() as EncryptedSavedObjectsPlugin['getDecryptedAsInternalUser'],
} as EncryptedSavedObjectsPlugin;

const actionTypeServiceParams = {
  taskManager: mockTaskManager,
  encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
};

beforeEach(() => jest.resetAllMocks());

describe('create()', () => {
  test('creates an action with all given properties', async () => {
    const expectedResult = Symbol();
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionService.create({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
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
    await expect(
      actionService.create({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    await expect(
      actionService.create({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionService.create({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce(expectedResult);
    const result = await actionService.get({ id: '1' });
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    savedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    const result = await actionService.find({});
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    savedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
    const result = await actionService.delete({ id: '1' });
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionService.update({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
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
    await expect(
      actionService.update({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    await expect(
      actionService.update({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionService = new ActionsClient({
      actionTypeService,
      savedObjectsClient,
    });
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionService.update({
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
