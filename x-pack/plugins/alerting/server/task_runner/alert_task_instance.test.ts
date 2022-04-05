/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager/server';
import { AlertingTaskInstance, taskInstanceToAlertTaskInstance } from './alert_task_instance';
import uuid from 'uuid';
import { RuleTypeParams, SanitizedRule } from '../types';

const alert: SanitizedRule<{
  bar: boolean;
}> = {
  id: 'alert-123',
  alertTypeId: '123',
  schedule: { interval: '10s' },
  params: {
    bar: true,
  },
  actions: [],
  enabled: true,
  name: '',
  tags: [],
  consumer: '',
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  apiKeyOwner: null,
  throttle: null,
  notifyWhen: null,
  muteAll: false,
  mutedInstanceIds: [],
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
};

describe('Alert Task Instance', () => {
  test(`validates that a TaskInstance has valid Alert Task State`, () => {
    const lastScheduledActionsDate = new Date();
    const taskInstance: ConcreteTaskInstance = {
      id: uuid.v4(),
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {
        alertTypeState: {
          some: 'value',
        },
        alertInstances: {
          first_instance: {
            state: {},
            meta: {
              lastScheduledActions: {
                group: 'first_group',
                date: lastScheduledActionsDate.toISOString(),
              },
            },
          },
          second_instance: {},
        },
      },
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    const alertTaskInsatnce: AlertingTaskInstance<RuleTypeParams> =
      taskInstanceToAlertTaskInstance(taskInstance);

    expect(alertTaskInsatnce).toEqual({
      ...taskInstance,
      state: {
        alertTypeState: {
          some: 'value',
        },
        alertInstances: {
          first_instance: {
            state: {},
            meta: {
              lastScheduledActions: {
                group: 'first_group',
                date: lastScheduledActionsDate,
              },
            },
          },
          second_instance: {},
        },
      },
    });
  });

  test(`throws if state is invalid`, () => {
    const taskInstance: ConcreteTaskInstance = {
      id: '215ee69b-1df9-428e-ab1a-ccf274f8fa5b',
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {
        alertTypeState: {
          some: 'value',
        },
        alertInstances: {
          first_instance: 'invalid',
          second_instance: {},
        },
      },
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    expect(() => taskInstanceToAlertTaskInstance(taskInstance)).toThrowErrorMatchingInlineSnapshot(
      `"Task \\"215ee69b-1df9-428e-ab1a-ccf274f8fa5b\\" has invalid state at .alertInstances.first_instance"`
    );
  });

  test(`throws with Alert id when alert is present and state is invalid`, () => {
    const taskInstance: ConcreteTaskInstance = {
      id: '215ee69b-1df9-428e-ab1a-ccf274f8fa5b',
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {
        alertTypeState: {
          some: 'value',
        },
        alertInstances: {
          first_instance: 'invalid',
          second_instance: {},
        },
      },
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    expect(() =>
      taskInstanceToAlertTaskInstance(taskInstance, alert)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Task \\"215ee69b-1df9-428e-ab1a-ccf274f8fa5b\\" (underlying Alert \\"alert-123\\") has invalid state at .alertInstances.first_instance"`
    );
  });

  test(`allows an initial empty state`, () => {
    const taskInstance: ConcreteTaskInstance = {
      id: uuid.v4(),
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {},
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    const alertTaskInsatnce: AlertingTaskInstance<RuleTypeParams> =
      taskInstanceToAlertTaskInstance(taskInstance);

    expect(alertTaskInsatnce).toEqual(taskInstance);
  });

  test(`validates that a TaskInstance has valid Params`, () => {
    const taskInstance: ConcreteTaskInstance = {
      id: uuid.v4(),
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {},
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };

    const alertTaskInsatnce: AlertingTaskInstance<RuleTypeParams> = taskInstanceToAlertTaskInstance(
      taskInstance,
      alert
    );

    expect(alertTaskInsatnce).toEqual(taskInstance);
  });

  test(`throws if params are invalid`, () => {
    const taskInstance: ConcreteTaskInstance = {
      id: '215ee69b-1df9-428e-ab1a-ccf274f8fa5b',
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {},
      taskType: 'alerting:test',
      params: {},
      ownerId: null,
    };

    expect(() =>
      taskInstanceToAlertTaskInstance(taskInstance, alert)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Task \\"215ee69b-1df9-428e-ab1a-ccf274f8fa5b\\" (underlying Alert \\"alert-123\\") has an invalid param at .0.alertId"`
    );
  });
});
