/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { createFireFunction } from '../create_fire_function';

const mockTaskManager = taskManagerMock.create();

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

describe('fire()', () => {
  test('schedules the action with all given parameters', async () => {
    const fireFn = createFireFunction({
      taskManager: mockTaskManager,
      savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: {
        actionTypeId: 'mock-action',
      },
    });
    await fireFn({
      id: '123',
      params: { baz: false },
      namespace: 'abc',
    });
    expect(mockTaskManager.schedule).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "params": Object {
          "actionTypeParams": Object {
            "baz": false,
          },
          "id": "123",
          "namespace": "abc",
        },
        "scope": Array [
          "alerting",
        ],
        "state": Object {},
        "taskType": "actions:mock-action",
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": undefined,
    },
  ],
}
`);
    expect(savedObjectsClient.get).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "action",
      "123",
      Object {
        "namespace": "abc",
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
