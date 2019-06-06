/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertExecuteOptions } from '../types';
import { SavedObjectsClientMock } from '../../../../../src/legacy/server/saved_objects/service/saved_objects_client.mock';
import { getCreateTaskRunnerFunction } from './get_create_task_runner_function';

const mockedNow = new Date('2019-06-03T18:55:25.982Z');
const mockedLastRunAt = new Date('2019-06-03T18:55:20.982Z');
(global as any).Date = class Date extends global.Date {
  static now() {
    return mockedNow.getTime();
  }
};

const getCreateTaskRunnerFunctionParams = {
  alertType: {
    id: 'test',
    description: 'My test alert',
    execute: jest.fn(),
  },
  fireAction: jest.fn(),
  savedObjectsClient: SavedObjectsClientMock.create(),
};

const mockedTaskInstance = {
  runAt: mockedLastRunAt,
  state: {
    previousRange: {
      from: new Date(mockedLastRunAt.getTime() - 10000),
      to: new Date(mockedLastRunAt.getTime() - 10000),
    },
    scheduledRunAt: mockedLastRunAt,
  },
  taskType: 'alerting:test',
  params: {
    alertId: '1',
  },
};

const mockedAlertTypeSavedObject = {
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
};

beforeEach(() => jest.resetAllMocks());

test('successfully executes the task', async () => {
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  getCreateTaskRunnerFunctionParams.savedObjectsClient.get.mockResolvedValueOnce(
    mockedAlertTypeSavedObject
  );
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  const runnerResult = await runner.run();
  expect(runnerResult).toMatchInlineSnapshot(`
Object {
  "runAt": 2019-06-03T18:55:30.982Z,
  "state": Object {
    "alertInstances": Object {},
    "alertTypeState": undefined,
    "previousRange": Object {
      "from": 2019-06-03T18:55:10.983Z,
      "to": 2019-06-03T18:55:20.982Z,
    },
    "scheduledRunAt": 2019-06-03T18:55:30.982Z,
  },
}
`);
  expect(getCreateTaskRunnerFunctionParams.alertType.execute).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "params": Object {
          "bar": true,
        },
        "range": Object {
          "from": 2019-06-03T18:55:10.983Z,
          "to": 2019-06-03T18:55:20.982Z,
        },
        "services": Object {
          "alertInstanceFactory": [Function],
        },
        "state": Object {},
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
});

test('fireAction is called per alert instance that fired', async () => {
  getCreateTaskRunnerFunctionParams.alertType.execute.mockImplementation(
    ({ services }: AlertExecuteOptions) => {
      services.alertInstanceFactory('1').fire('default');
    }
  );
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  getCreateTaskRunnerFunctionParams.savedObjectsClient.get.mockResolvedValueOnce(
    mockedAlertTypeSavedObject
  );
  const runner = createTaskRunner({ taskInstance: mockedTaskInstance });
  await runner.run();
  expect(getCreateTaskRunnerFunctionParams.fireAction).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "id": "1",
        "params": Object {
          "foo": true,
        },
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
});

test('persists alertInstances passed in from state, only if they fire', async () => {
  getCreateTaskRunnerFunctionParams.alertType.execute.mockImplementation(
    ({ services }: AlertExecuteOptions) => {
      services.alertInstanceFactory('1').fire('default');
    }
  );
  const createTaskRunner = getCreateTaskRunnerFunction(getCreateTaskRunnerFunctionParams);
  getCreateTaskRunnerFunctionParams.savedObjectsClient.get.mockResolvedValueOnce(
    mockedAlertTypeSavedObject
  );
  const runner = createTaskRunner({
    taskInstance: {
      ...mockedTaskInstance,
      state: {
        ...mockedTaskInstance.state,
        alertInstances: {
          '1': { meta: {}, state: { bar: false } },
          '2': { meta: {}, state: { bar: false } },
        },
      },
    },
  });
  const runnerResult = await runner.run();
  expect(runnerResult.state.alertInstances).toMatchInlineSnapshot(`
Object {
  "1": Object {
    "meta": Object {
      "lastFired": 1559588125982,
    },
    "state": Object {
      "bar": false,
    },
  },
}
`);
});
