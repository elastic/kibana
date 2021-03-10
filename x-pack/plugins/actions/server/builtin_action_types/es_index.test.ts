/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./lib/send_email', () => ({
  sendEmail: jest.fn(),
}));

import { validateConfig, validateParams } from '../lib';
import { createActionTypeRegistry } from './index.test';
import { actionsMock } from '../mocks';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ESIndexActionType,
  ESIndexActionTypeExecutorOptions,
} from './es_index';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../src/core/server/elasticsearch/client/mocks';

const ACTION_TYPE_ID = '.index';

const services = actionsMock.createServices();

let actionType: ESIndexActionType;

beforeAll(() => {
  const { actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<ActionTypeConfigType, {}, ActionParamsType>(ACTION_TYPE_ID);
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
    const config: Record<string, unknown> = {
      index: 'testing-123',
      refresh: false,
    };

    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
      executionTimeField: null,
    });

    config.executionTimeField = 'field-123';
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
      executionTimeField: 'field-123',
    });

    config.executionTimeField = null;
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      index: 'testing-123',
      refresh: false,
      executionTimeField: null,
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
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [executionTimeField]: types that failed validation:
- [executionTimeField.0]: expected value of type [string] but got [boolean]
- [executionTimeField.1]: expected value to equal [null]"
`);

    delete config.refresh;
    expect(() => {
      validateConfig(actionType, { index: 'testing-123', refresh: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [refresh]: expected value of type [boolean] but got [string]"`
    );
  });

  test('config validation fails when config is not valid', () => {
    const baseConfig: Record<string, unknown> = {
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
    const params: Record<string, unknown> = {
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
    let executorOptions: ESIndexActionTypeExecutorOptions;

    // minimal params
    config = { index: 'index-value', refresh: false, executionTimeField: null };
    params = {
      documents: [{ jim: 'bob' }],
    };

    const actionId = 'some-id';

    executorOptions = {
      actionId,
      config,
      secrets,
      params,
      services,
    };
    const scopedClusterClient = elasticsearchClientMock.createClusterClient().asScoped()
      .asCurrentUser;
    await actionType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    expect(scopedClusterClient.bulk.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
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
    scopedClusterClient.bulk.mockClear();
    await actionType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    const calls = scopedClusterClient.bulk.mock.calls;
    const timeValue = ((calls[0][0]?.body as unknown[])[1] as Record<string, unknown>)
      .field_to_use_for_time;
    expect(timeValue).toBeInstanceOf(Date);
    delete ((calls[0][0]?.body as unknown[])[1] as Record<string, unknown>).field_to_use_for_time;
    expect(calls).toMatchInlineSnapshot(`
        Array [
          Array [
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
    config = { index: 'index-value', executionTimeField: null, refresh: false };
    params = {
      documents: [{ jim: 'bob' }],
    };

    executorOptions = { actionId, config, secrets, params, services };

    scopedClusterClient.bulk.mockClear();
    await actionType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    expect(scopedClusterClient.bulk.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
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
    config = { index: 'index-value', executionTimeField: null, refresh: false };
    params = {
      documents: [{ a: 1 }, { b: 2 }],
    };

    executorOptions = { actionId, config, secrets, params, services };
    scopedClusterClient.bulk.mockClear();
    await actionType.executor({
      ...executorOptions,
      services: { ...services, scopedClusterClient },
    });

    expect(scopedClusterClient.bulk.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
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

  test('resolves with an error when an error occurs in the indexing operation', async () => {
    const secrets = {};
    // minimal params
    const config = { index: 'index-value', refresh: false, executionTimeField: null };
    const params = {
      documents: [{ '': 'bob' }],
    };

    const actionId = 'some-id';
    const scopedClusterClient = elasticsearchClientMock.createClusterClient().asScoped()
      .asCurrentUser;
    scopedClusterClient.bulk.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        took: 0,
        errors: true,
        items: [
          {
            index: {
              _index: 'indexme',
              _id: '7buTjHQB0SuNSiS9Hayt',
              status: 400,
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse',
                caused_by: {
                  type: 'illegal_argument_exception',
                  reason: 'field name cannot be an empty string',
                },
              },
            },
          },
        ],
      })
    );

    expect(await actionType.executor({ actionId, config, secrets, params, services }))
      .toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error indexing documents",
        "serviceMessage": "Cannot destructure property 'body' of '(intermediate value)' as it is undefined.",
        "status": "error",
      }
    `);
  });
});
