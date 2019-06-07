/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { getCreateTaskRunnerFunction } from '../get_create_task_runner_function';

const mockedEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

const getCreateTaskRunnerFunctionParams = {
  services: {
    log: jest.fn(),
  },
  actionType: {
    id: '1',
    name: '1',
    executor: jest.fn(),
  },
  encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
};

const taskInstanceMock = {
  runAt: new Date(),
  state: {},
  params: {
    id: '2',
    actionTypeParams: { baz: true },
    namespace: 'test',
  },
  taskType: 'actions:1',
};

beforeEach(() => jest.resetAllMocks());

test('successfully executes the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const runner = createTaskRunner({ taskInstance: taskInstanceMock });
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '1',
    type: 'action',
    references: [],
    attributes: {
      actionTypeConfig: { foo: true },
      actionTypeConfigSecrets: { bar: true },
    },
  });
  const runnerResult = await runner.run();
  expect(runnerResult).toBeUndefined();
  expect(mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
  expect(mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mock.calls[0])
    .toMatchInlineSnapshot(`
Array [
  "action",
  "2",
  Object {
    "namespace": "test",
  },
]
`);
  expect(getCreateTaskRunnerFunctionParams.actionType.executor).toHaveBeenCalledTimes(1);
  expect(getCreateTaskRunnerFunctionParams.actionType.executor.mock.calls[0])
    .toMatchInlineSnapshot(`
Array [
  Object {
    "actionTypeConfig": Object {
      "bar": true,
      "foo": true,
    },
    "params": Object {
      "baz": true,
    },
    "services": Object {
      "log": [MockFunction],
    },
  },
]
`);
});
