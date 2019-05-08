/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ActionTypeService } from '../action_type_service';
import { ActionService } from '../action_service';

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

const mockEncryptedSavedObjects = {
  getDecryptedAsInternalUser: jest.fn(),
};

describe('create()', () => {
  test('creates an action with all given properties', async () => {
    const expectedResult = Symbol();
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionService.create(savedObjectsClient, {
      description: 'my description',
      actionTypeId: 'my-action-type',
      actionTypeConfig: {},
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
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
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
      actionService.create(savedObjectsClient, {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test(`throws an error when an action type doesn't exist`, async () => {
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    await expect(
      actionService.create(savedObjectsClient, {
        description: 'my description',
        actionTypeId: 'unregistered-action-type',
        actionTypeConfig: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const expectedResult = Symbol();
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    savedObjectsClient.create.mockResolvedValueOnce(expectedResult);
    const result = await actionService.create(savedObjectsClient, {
      description: 'my description',
      actionTypeId: 'my-action-type',
      actionTypeConfig: {
        a: true,
        b: true,
        c: true,
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
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
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
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
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
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
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
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionService.update(
      savedObjectsClient,
      'my-action',
      {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {},
      },
      {}
    );
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
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
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
      actionService.update(
        savedObjectsClient,
        'my-action',
        {
          description: 'my description',
          actionTypeId: 'my-action-type',
          actionTypeConfig: {},
        },
        {}
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"child \\"param1\\" fails because [\\"param1\\" is required]"`
    );
  });

  test(`throws an error when action type doesn't exist`, async () => {
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    await expect(
      actionService.update(
        savedObjectsClient,
        'my-action',
        {
          description: 'my description',
          actionTypeId: 'unregistered-action-type',
          actionTypeConfig: {},
        },
        {}
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    const expectedResult = Symbol();
    const actionTypeService = new ActionTypeService();
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'c'],
      async executor() {},
    });
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    savedObjectsClient.update.mockResolvedValueOnce(expectedResult);
    const result = await actionService.update(
      savedObjectsClient,
      'my-action',
      {
        description: 'my description',
        actionTypeId: 'my-action-type',
        actionTypeConfig: {
          a: true,
          b: true,
          c: true,
        },
      },
      {}
    );
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

describe('fire()', () => {
  test('fires an action with all given parameters', async () => {
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    const mockActionType = jest.fn().mockResolvedValueOnce({ success: true });
    actionTypeService.register({
      id: 'mock',
      name: 'Mock',
      executor: mockActionType,
    });
    mockEncryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: 'mock-action',
      attributes: {
        actionTypeId: 'mock',
        actionTypeConfigSecrets: {
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
    expect(mockActionType).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "actionTypeConfig": Object {
          "foo": true,
        },
        "params": Object {
          "baz": false,
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
    expect(mockEncryptedSavedObjects.getDecryptedAsInternalUser.mock.calls).toEqual([
      ['action', 'mock-action'],
    ]);
  });

  test(`throws an error when the action type isn't registered`, async () => {
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    mockEncryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: 'mock-action',
      attributes: {
        actionTypeId: 'non-registered-action-type',
        actionTypeConfigSecrets: {
          foo: true,
        },
      },
    });
    await expect(
      actionService.fire({ savedObjectsClient, id: 'mock-action', params: { baz: false } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"non-registered-action-type\\" is not registered."`
    );
  });

  test('merges encrypted and unencrypted attributes', async () => {
    const actionTypeService = new ActionTypeService();
    const actionService = new ActionService(actionTypeService, mockEncryptedSavedObjects);
    const mockActionType = jest.fn().mockResolvedValueOnce({ success: true });
    actionTypeService.register({
      id: 'mock',
      name: 'Mock',
      unencryptedAttributes: ['a', 'c'],
      executor: mockActionType,
    });
    mockEncryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: 'mock-action',
      attributes: {
        actionTypeId: 'mock',
        actionTypeConfig: {
          a: true,
          c: true,
        },
        actionTypeConfigSecrets: {
          b: true,
        },
      },
    });
    const result = await actionService.fire({
      id: 'mock-action',
      params: { baz: false },
      savedObjectsClient,
    });
    expect(result).toEqual({ success: true });
    expect(mockActionType).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "actionTypeConfig": Object {
          "a": true,
          "b": true,
          "c": true,
        },
        "params": Object {
          "baz": false,
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
});
