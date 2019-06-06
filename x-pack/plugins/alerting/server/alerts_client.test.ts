/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from './alerts_client';
import { SavedObjectsClientMock } from '../../../../src/legacy/server/saved_objects/service/saved_objects_client.mock';
import { taskManagerMock } from '../../task_manager/task_manager.mock';
import { alertTypeRegistryMock } from './alert_type_registry.mock';

const alertsClientParams = {
  alertTypeRegistry: alertTypeRegistryMock.create(),
  savedObjectsClient: SavedObjectsClientMock.create(),
  taskManager: taskManagerMock.create(),
};

beforeEach(() => jest.resetAllMocks());

const mockedDate = new Date('2019-02-12T21:01:22.479Z');
(global as any).Date = class Date {
  constructor() {
    return mockedDate;
  }
  static now() {
    return mockedDate.getTime();
  }
};

function getMockData() {
  return {
    alertTypeId: '123',
    interval: 10000,
    alertTypeParams: {
      bar: true,
    },
    actions: [
      {
        group: 'default',
        id: '1',
        params: {
          foo: true,
        },
      },
    ],
  };
}

describe('create()', () => {
  test('creates an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertsClientParams.savedObjectsClient.create.mockResolvedValueOnce({
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
    alertsClientParams.taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      sequenceNumber: 1,
      primaryTerm: 1,
      scheduledAt: new Date(),
      attempts: 1,
      status: 'idle',
      runAt: new Date(),
      state: {},
      params: {},
    });
    alertsClientParams.savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          id: '1',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
    const result = await alertsClient.create({ data });
    expect(result).toMatchInlineSnapshot(`
Object {
  "actions": Array [
    Object {
      "group": "default",
      "id": "1",
      "params": Object {
        "foo": true,
      },
    },
  ],
  "alertTypeId": "123",
  "alertTypeParams": Object {
    "bar": true,
  },
  "id": "1",
  "interval": 10000,
  "scheduledTaskId": "task-123",
}
`);
    expect(alertsClientParams.savedObjectsClient.create).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "alert",
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "alertTypeParams": Object {
          "bar": true,
        },
        "interval": 10000,
      },
      Object {
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
        ],
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
    expect(alertsClientParams.taskManager.schedule).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "params": Object {
          "alertId": "1",
        },
        "scope": Array [
          "alerting",
        ],
        "state": Object {
          "previousRange": Object {
            "from": 2019-02-12T21:01:22.479Z,
            "to": 2019-02-12T21:01:22.479Z,
          },
          "scheduledRunAt": 2019-02-12T21:01:22.479Z,
        },
        "taskType": "alerting:123",
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
    expect(alertsClientParams.savedObjectsClient.update).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "alert",
      "1",
      Object {
        "scheduledTaskId": "task-123",
      },
      Object {
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
        ],
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

  test('throws error if create saved object fails', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertsClientParams.savedObjectsClient.create.mockRejectedValueOnce(new Error('Test failure'));
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(alertsClientParams.taskManager.schedule).not.toHaveBeenCalled();
  });

  test('attempts to remove saved object if scheduling failed', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertsClientParams.savedObjectsClient.create.mockResolvedValueOnce({
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
    alertsClientParams.taskManager.schedule.mockRejectedValueOnce(new Error('Test failure'));
    alertsClientParams.savedObjectsClient.delete.mockResolvedValueOnce({});
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(alertsClientParams.savedObjectsClient.delete).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "alert",
      "1",
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

  test('throws an error if alert type not registerd', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const data = getMockData();
    alertsClientParams.alertTypeRegistry.get.mockImplementation(() => {
      throw new Error('Invalid type');
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid type"`
    );
  });
});

describe('get()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClientParams.savedObjectsClient.get.mockResolvedValueOnce({
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
    const result = await alertsClient.get({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
Object {
  "actions": Array [
    Object {
      "group": "default",
      "id": "1",
      "params": Object {
        "foo": true,
      },
    },
  ],
  "alertTypeId": "123",
  "alertTypeParams": Object {
    "bar": true,
  },
  "id": "1",
  "interval": 10000,
}
`);
    expect(alertsClientParams.savedObjectsClient.get).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "alert",
      "1",
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

  test(`throws an error when references aren't found`, async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClientParams.savedObjectsClient.get.mockResolvedValueOnce({
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
      references: [],
    });
    await expect(alertsClient.get({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Reference action_0 not found"`
    );
  });
});

describe('find()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClientParams.savedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
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
        },
      ],
    });
    const result = await alertsClient.find();
    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "actions": Array [
      Object {
        "group": "default",
        "id": "1",
        "params": Object {
          "foo": true,
        },
      },
    ],
    "alertTypeId": "123",
    "alertTypeParams": Object {
      "bar": true,
    },
    "id": "1",
    "interval": 10000,
  },
]
`);
    expect(alertsClientParams.savedObjectsClient.find).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "type": "alert",
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

describe('delete()', () => {
  test('successfully removes an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClientParams.savedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        interval: 10000,
        alertTypeParams: {
          bar: true,
        },
        scheduledTaskId: 'task-123',
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
    alertsClientParams.savedObjectsClient.delete.mockResolvedValueOnce({
      success: true,
    });
    alertsClientParams.taskManager.remove.mockResolvedValueOnce({
      index: '.task_manager',
      id: 'task-123',
      sequenceNumber: 1,
      primaryTerm: 1,
      result: '',
    });
    const result = await alertsClient.delete({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
Object {
  "success": true,
}
`);
    expect(alertsClientParams.savedObjectsClient.delete).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "alert",
      "1",
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
    expect(alertsClientParams.taskManager.remove).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "task-123",
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

describe('update()', () => {
  test('updates given parameters', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClientParams.savedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
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
    const result = await alertsClient.update({
      id: '1',
      data: {
        interval: 10000,
        alertTypeParams: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
      options: {
        version: '123',
      },
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "actions": Array [
    Object {
      "group": "default",
      "id": "1",
      "params": Object {
        "foo": true,
      },
    },
  ],
  "alertTypeParams": Object {
    "bar": true,
  },
  "id": "1",
  "interval": 10000,
}
`);
    expect(alertsClientParams.savedObjectsClient.update).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "alert",
      "1",
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeParams": Object {
          "bar": true,
        },
        "interval": 10000,
      },
      Object {
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
        ],
        "version": "123",
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
