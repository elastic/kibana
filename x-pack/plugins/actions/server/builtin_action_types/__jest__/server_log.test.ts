/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from '../../action_type_registry';

import { registerBuiltInActionTypes } from '../index';

const ACTION_TYPE_ID = 'kibana.server-log';
const NO_OP_FN = () => {};

const services = {
  log: NO_OP_FN,
};

let actionTypeRegistry: ActionTypeRegistry;

beforeAll(() => {
  actionTypeRegistry = new ActionTypeRegistry({ services });
  registerBuiltInActionTypes(actionTypeRegistry);
});

beforeEach(() => {
  services.log = NO_OP_FN;
});

describe('action is registered', () => {
  test('gets registered with builtin actions', () => {
    expect(actionTypeRegistry.has(ACTION_TYPE_ID)).toEqual(true);
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('server-log');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    actionTypeRegistry.validateParams(ACTION_TYPE_ID, { message: 'a message' });
    actionTypeRegistry.validateParams(ACTION_TYPE_ID, {
      message: 'a message',
      tags: ['info', 'blorg'],
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      actionTypeRegistry.validateParams(ACTION_TYPE_ID, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"child \\"message\\" fails because [\\"message\\" is required]"`
    );

    expect(() => {
      actionTypeRegistry.validateParams(ACTION_TYPE_ID, { message: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"child \\"message\\" fails because [\\"message\\" must be a string]"`
    );

    expect(() => {
      actionTypeRegistry.validateParams(ACTION_TYPE_ID, { message: 'x', tags: 2 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"child \\"tags\\" fails because [\\"tags\\" must be an array]"`
    );

    expect(() => {
      actionTypeRegistry.validateParams(ACTION_TYPE_ID, { message: 'x', tags: [2] });
    }).toThrowErrorMatchingInlineSnapshot(
      `"child \\"tags\\" fails because [\\"tags\\" at position 0 fails because [\\"0\\" must be a string]]"`
    );
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const mockLog = jest.fn().mockResolvedValueOnce({ success: true });

    services.log = mockLog;
    await actionTypeRegistry.execute({
      id: ACTION_TYPE_ID,
      actionTypeConfig: {},
      params: { message: 'message text here', tags: ['tag1', 'tag2'] },
    });
    expect(mockLog).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        "tag1",
        "tag2",
      ],
      "message text here",
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
