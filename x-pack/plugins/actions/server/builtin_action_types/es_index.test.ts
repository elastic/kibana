/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/send_email', () => ({
  sendEmail: jest.fn(),
}));

import { ActionType, ActionTypeExecutorOptions } from '../types';
import { validateConfig, validateParams } from '../lib';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { createActionTypeRegistry } from './index.test';
import { ActionParamsType, ActionTypeConfigType } from './es_index';

const ACTION_TYPE_ID = '.index';
const NO_OP_FN = () => {};

const services = {
  log: NO_OP_FN,
  callCluster: jest.fn(),
  savedObjectsClient: savedObjectsClientMock.create(),
};

let actionType: ActionType;

beforeAll(() => {
  const { actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Index');
  });
});

describe('config validation', () => {
  test('config validation succeeds when config is valid', () => {
    const config: Record<string, any> = {
      index: 'testing-123',
      refresh: false,
    };

    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
    });

    config.executionTimeField = 'field-123';
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
      executionTimeField: 'field-123',
    });

    delete config.index;

    expect(() => {
      validateConfig(actionType, { index: 666 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [index]: expected value of type [string] but got [number]"`
    );
    delete config.executionTimeField;

    expect(() => {
      validateConfig(actionType, { index: 'testing-123', executionTimeField: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [executionTimeField]: expected value of type [string] but got [boolean]"`
    );

    delete config.refresh;
    expect(() => {
      validateConfig(actionType, { index: 'testing-123', refresh: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [refresh]: expected value of type [boolean] but got [string]"`
    );
  });

  test('config validation fails when config is not valid', () => {
    const baseConfig: Record<string, any> = {
      indeX: 'bob',
    };

    expect(() => {
      validateConfig(actionType, baseConfig);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [index]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('params validation', () => {
  test('params validation succeeds when params is valid', () => {
    const params: Record<string, any> = {
      documents: [{ rando: 'thing' }],
    };
    expect(validateParams(actionType, params)).toMatchInlineSnapshot(`
        Object {
          "documents": Array [
            Object {
              "rando": "thing",
            },
          ],
        }
    `);
  });

  test('params validation fails when params is not valid', () => {
    expect(() => {
      validateParams(actionType, { documents: [{}], jim: 'bob' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [jim]: definition for this key is missing"`
    );

    expect(() => {
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [documents]: expected value of type [array] but got [undefined]"`
    );

    expect(() => {
      validateParams(actionType, { documents: ['should be an object'] });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [documents.0]: could not parse record value from json input"`
    );
  });
});

describe('execute()', () => {
  test('ensure parameters are as expected', async () => {
    const secrets = {};
    let config: ActionTypeConfigType;
    let params: ActionParamsType;
    let executorOptions: ActionTypeExecutorOptions;

    // minimal params
    config = { index: 'index-value', refresh: false, executionTimeField: undefined };
    params = {
      documents: [{ jim: 'bob' }],
    };

    const actionId = 'some-id';

    executorOptions = { actionId, config, secrets, params, services };
    services.callCluster.mockClear();
    await actionType.executor(executorOptions);

    expect(services.callCluster.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "bulk",
              Object {
                "body": Array [
                  Object {
                    "index": Object {},
                  },
                  Object {
                    "jim": "bob",
                  },
                ],
                "index": "index-value",
                "refresh": false,
              },
            ],
          ]
    `);

    // full params
    config = { index: 'index-value', executionTimeField: 'field_to_use_for_time', refresh: true };
    params = {
      documents: [{ jimbob: 'jr' }],
    };

    executorOptions = { actionId, config, secrets, params, services };
    services.callCluster.mockClear();
    await actionType.executor(executorOptions);

    const calls = services.callCluster.mock.calls;
    const timeValue = calls[0][1].body[1].field_to_use_for_time;
    expect(timeValue).toBeInstanceOf(Date);
    delete calls[0][1].body[1].field_to_use_for_time;
    expect(calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "bulk",
            Object {
              "body": Array [
                Object {
                  "index": Object {},
                },
                Object {
                  "jimbob": "jr",
                },
              ],
              "index": "index-value",
              "refresh": true,
            },
          ],
        ]
    `);

    // minimal params
    config = { index: 'index-value', executionTimeField: undefined, refresh: false };
    params = {
      documents: [{ jim: 'bob' }],
    };

    executorOptions = { actionId, config, secrets, params, services };
    services.callCluster.mockClear();
    await actionType.executor(executorOptions);

    expect(services.callCluster.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "bulk",
          Object {
            "body": Array [
              Object {
                "index": Object {},
              },
              Object {
                "jim": "bob",
              },
            ],
            "index": "index-value",
            "refresh": false,
          },
        ],
      ]
    `);

    // multiple documents
    config = { index: 'index-value', executionTimeField: undefined, refresh: false };
    params = {
      documents: [{ a: 1 }, { b: 2 }],
    };

    executorOptions = { actionId, config, secrets, params, services };
    services.callCluster.mockClear();
    await actionType.executor(executorOptions);

    expect(services.callCluster.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "bulk",
              Object {
                "body": Array [
                  Object {
                    "index": Object {},
                  },
                  Object {
                    "a": 1,
                  },
                  Object {
                    "index": Object {},
                  },
                  Object {
                    "b": 2,
                  },
                ],
                "index": "index-value",
                "refresh": false,
              },
            ],
          ]
    `);
  });
});
