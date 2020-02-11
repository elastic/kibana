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
    const config: Record<string, any> = {};

    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      index: null,
    });

    config.index = 'testing-123';
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      index: 'testing-123',
    });
  });

  test('config validation fails when config is not valid', () => {
    const baseConfig: Record<string, any> = {
      indeX: 'bob',
    };

    expect(() => {
      validateConfig(actionType, baseConfig);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [indeX]: definition for this key is missing"`
    );

    delete baseConfig.user;
    baseConfig.index = 666;

    expect(() => {
      validateConfig(actionType, baseConfig);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [index]: types that failed validation:
- [index.0]: expected value of type [string] but got [number]
- [index.1]: expected value to equal [null] but got [666]"
`);
  });
});

describe('params validation', () => {
  test('params validation succeeds when params is valid', () => {
    const params: Record<string, any> = {
      index: 'testing-123',
      executionTimeField: 'field-used-for-time',
      refresh: true,
      documents: [{ rando: 'thing' }],
    };
    expect(validateParams(actionType, params)).toMatchInlineSnapshot(`
        Object {
          "documents": Array [
            Object {
              "rando": "thing",
            },
          ],
          "executionTimeField": "field-used-for-time",
          "index": "testing-123",
          "refresh": true,
        }
    `);

    delete params.index;
    delete params.refresh;
    delete params.executionTimeField;
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
      validateParams(actionType, { index: 666 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [index]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateParams(actionType, { executionTimeField: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [executionTimeField]: expected value of type [string] but got [boolean]"`
    );

    expect(() => {
      validateParams(actionType, { refresh: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [refresh]: expected value of type [boolean] but got [string]"`
    );

    expect(() => {
      validateParams(actionType, { documents: ['should be an object'] });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [documents.0]: could not parse record value from [should be an object]"`
    );
  });
});

describe('execute()', () => {
  test('ensure parameters are as expected', async () => {
    const secrets = {};
    let config: ActionTypeConfigType;
    let params: ActionParamsType;
    let executorOptions: ActionTypeExecutorOptions;

    // minimal params, index via param
    config = { index: null };
    params = {
      index: 'index-via-param',
      documents: [{ jim: 'bob' }],
      executionTimeField: undefined,
      refresh: undefined,
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
                "index": "index-via-param",
              },
            ],
          ]
    `);

    // full params (except index), index via config
    config = { index: 'index-via-config' };
    params = {
      index: undefined,
      documents: [{ jimbob: 'jr' }],
      executionTimeField: 'field_to_use_for_time',
      refresh: true,
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
              "index": "index-via-config",
              "refresh": true,
            },
          ],
        ]
    `);

    // minimal params, index via config and param
    config = { index: 'index-via-config' };
    params = {
      index: 'index-via-param',
      documents: [{ jim: 'bob' }],
      executionTimeField: undefined,
      refresh: undefined,
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
            "index": "index-via-config",
          },
        ],
      ]
    `);

    // multiple documents
    config = { index: null };
    params = {
      index: 'index-via-param',
      documents: [{ a: 1 }, { b: 2 }],
      executionTimeField: undefined,
      refresh: undefined,
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
                "index": "index-via-param",
              },
            ],
          ]
    `);
  });
});
