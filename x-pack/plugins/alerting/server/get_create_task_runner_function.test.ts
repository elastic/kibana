/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from './__mocks__/saved_objects_client.mock';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';

const getCreateTaskRunnerFunctionParams = {
  alertType: {
    id: 'test',
    description: 'My test alert',
    execute: jest.fn(),
  },
  fireAction: jest.fn(),
  savedObjectsClient: savedObjectsClientMock.create(),
};

beforeEach(() => jest.resetAllMocks());

test('successfully executes the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  const taskInstance = {
    runAt: new Date(),
    state: {
      previousRange: {
        from: new Date(),
        to: new Date(),
      },
      scheduledRunAt: new Date(),
    },
    taskType: 'alerting:test',
    params: {
      alertId: '1',
    },
  };
  getCreateTaskRunnerFunctionParams.savedObjectsClient.get.mockResolvedValueOnce({
    id: '1',
    type: 'alert',
    attributes: {
      alertTypeId: '123',
      interval: 10000,
      alertTypeParams: {
        bar: true,
      },
      actions: [
        {
          group: 'default',
          actionRef: 'action_0',
          params: {
            foo: true,
          },
        },
      ],
    },
    references: [
      {
        name: 'action_0',
        type: 'action',
        id: '1',
      },
    ],
  });
  const runner = createTaskRunner({ taskInstance });
  const runnerResult = await runner.run();
  expect(runnerResult).toMatchInlineSnapshot(`
Object {
  "runAt": 2019-06-03T18:55:20.982Z,
  "state": Object {
    "alertInstances": Object {},
    "alertTypeState": undefined,
    "previousRange": Object {
      "from": 2019-06-03T18:55:10.983Z,
      "to": 2019-06-03T18:55:10.982Z,
    },
    "scheduledRunAt": 2019-06-03T18:55:20.982Z,
  },
}
`);
});
