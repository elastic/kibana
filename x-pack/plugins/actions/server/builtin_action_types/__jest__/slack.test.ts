/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from '../../action_type_registry';

import { setIncomingWebhookImpl } from '../slack';
import { registerBuiltInActionTypes } from '../index';
import { MockIncomingWebhook } from './incoming_webhook.mock';

const ACTION_TYPE_ID = 'kibana.slack';

let actionTypeRegistry: ActionTypeRegistry;

const NO_OP_FN = () => {};

const services = {
  log: NO_OP_FN,
};

beforeAll(() => {
  actionTypeRegistry = new ActionTypeRegistry({ services });
  registerBuiltInActionTypes(actionTypeRegistry);
  setIncomingWebhookImpl(MockIncomingWebhook);
});

afterAll(() => {
  setIncomingWebhookImpl();
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
    expect(actionType.name).toEqual('slack');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    actionTypeRegistry.validateParams(ACTION_TYPE_ID, { message: 'a message' });
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
  });
});

describe('validateActionTypeConfig()', () => {
  test('should validate and pass when params is valid', () => {
    actionTypeRegistry.validateActionTypeConfig(ACTION_TYPE_ID, {
      webhookUrl: 'https://example.com',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      actionTypeRegistry.validateActionTypeConfig(ACTION_TYPE_ID, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"child \\"webhookUrl\\" fails because [\\"webhookUrl\\" is required]"`
    );

    expect(() => {
      actionTypeRegistry.validateActionTypeConfig(ACTION_TYPE_ID, { webhookUrl: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"child \\"webhookUrl\\" fails because [\\"webhookUrl\\" must be a string]"`
    );
  });
});

describe('execute()', () => {
  test('calls the mock executor with success', async () => {
    const response = await actionTypeRegistry.execute({
      id: ACTION_TYPE_ID,
      actionTypeConfig: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
    });
    expect(response).toMatchInlineSnapshot(`
Object {
  "text": "mockIncomingWebhook success: this invocation should succeed",
}
`);
  });

  test('calls the mock executor with failure', async () => {
    await expect(
      actionTypeRegistry.execute({
        id: ACTION_TYPE_ID,
        actionTypeConfig: { webhookUrl: 'http://example.com' },
        params: { message: 'failure: this invocation should fail' },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mockIncomingWebhook failure: this invocation should fail"`
    );
  });
});
