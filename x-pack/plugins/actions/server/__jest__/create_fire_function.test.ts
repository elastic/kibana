/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from '../action_type_registry';
import { createFireFunction } from '../create_fire_function';

const mockEncryptedSavedObjects = {
  isEncryptionError: jest.fn(),
  registerType: jest.fn(),
  getDecryptedAsInternalUser: jest.fn(),
};

describe('fire()', () => {
  test('fires an action with all given parameters', async () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    const fireFn = createFireFunction({
      actionTypeRegistry,
      encryptedSavedObjectsPlugin: mockEncryptedSavedObjects,
    });
    const mockActionType = jest.fn().mockResolvedValueOnce({ success: true });
    actionTypeRegistry.register({
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
    const result = await fireFn({
      id: 'mock-action',
      params: { baz: false },
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
      ['action', 'mock-action', { namespace: undefined }],
    ]);
  });

  test(`throws an error when the action type isn't registered`, async () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    const fireFn = createFireFunction({
      actionTypeRegistry,
      encryptedSavedObjectsPlugin: mockEncryptedSavedObjects,
    });
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
      fireFn({ id: 'mock-action', params: { baz: false } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"non-registered-action-type\\" is not registered."`
    );
  });

  test('merges encrypted and unencrypted attributes', async () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    const fireFn = createFireFunction({
      actionTypeRegistry,
      encryptedSavedObjectsPlugin: mockEncryptedSavedObjects,
    });
    const mockActionType = jest.fn().mockResolvedValueOnce({ success: true });
    actionTypeRegistry.register({
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
    const result = await fireFn({
      id: 'mock-action',
      params: { baz: false },
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
