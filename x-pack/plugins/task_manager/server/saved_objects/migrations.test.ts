/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { getMigrations } from './migrations';
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { migrationMocks } from '@kbn/core/server/mocks';
import {
  TaskInstanceWithDeprecatedFields,
  SerializedConcreteTaskInstance,
  TaskStatus,
} from '../task';

const migrationContext = migrationMocks.createContext();

describe('successful migrations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  describe('7.4.0', () => {
    test('extend task instance with updated_at', () => {
      const migration740 = getMigrations()['7.4.0'];
      const taskInstance = getMockData({});
      expect(migration740(taskInstance, migrationContext).attributes.updated_at).not.toBeNull();
    });
  });

  describe('7.6.0', () => {
    test('rename property Internal to Schedule', () => {
      const migration760 = getMigrations()['7.6.0'];
      const taskInstance = getMockData({});
      expect(migration760(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          schedule: taskInstance.attributes.schedule,
        },
      });
    });
  });

  describe('8.0.0', () => {
    test('transforms actionsTasksLegacyIdToSavedObjectIds', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'actions:123456',
        params: JSON.stringify({ spaceId: 'user1', actionTaskParamsId: '123456' }),
      });

      expect(migration800(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          params: '{"spaceId":"user1","actionTaskParamsId":"800f81f8-980e-58ca-b710-d1b0644adea2"}',
        },
      });
    });

    test('it is only applicable for saved objects that live in a custom space', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'actions:123456',
        params: JSON.stringify({ spaceId: 'default', actionTaskParamsId: '123456' }),
      });

      expect(migration800(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('it is only applicable for saved objects that live in a custom space even if spaces are disabled', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'actions:123456',
        params: JSON.stringify({ actionTaskParamsId: '123456' }),
      });

      expect(migration800(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('transforms alertingTaskLegacyIdToSavedObjectIds', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123456',
        params: JSON.stringify({ spaceId: 'user1', alertId: '123456' }),
      });

      expect(migration800(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          params: '{"spaceId":"user1","alertId":"1a4f9206-e25f-58e6-bad5-3ff21e90648e"}',
        },
      });
    });

    test('skip transformation for defult space scenario', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123456',
        params: JSON.stringify({ spaceId: 'default', alertId: '123456' }),
      });

      expect(migration800(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          params: '{"spaceId":"default","alertId":"123456"}',
        },
      });
    });
  });

  describe('8.2.0', () => {
    test('resets attempts and status of a "failed" alerting tasks without schedule interval', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123',
        status: 'failed',
        schedule: undefined,
      });

      expect(migration820(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          attempts: 0,
          status: 'idle',
        },
      });
    });

    test('resets attempts and status of a "running" alerting tasks without schedule interval', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123',
        status: 'running',
        schedule: undefined,
      });

      expect(migration820(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          attempts: 0,
          status: 'idle',
        },
      });
    });

    test('does not update the tasks that are not "failed"', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123',
        status: 'idle',
        attempts: 3,
        schedule: undefined,
      });

      expect(migration820(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('does not update the tasks that are not "failed" and has a schedule', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123',
        status: 'idle',
        attempts: 3,
        schedule: { interval: '1000' },
      });

      expect(migration820(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('resets "unrecognized" status to "idle" when task type is not in REMOVED_TYPES list', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'someValidTask',
        status: 'unrecognized',
      });

      expect(migration820(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          status: 'idle',
        },
      });
    });

    test('does not modify "unrecognized" status when task type is in REMOVED_TYPES list', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'sampleTaskRemovedType',
        status: 'unrecognized',
      });

      expect(migration820(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('does not modify document when status is "running"', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'someTask',
        status: 'running',
      });

      expect(migration820(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('does not modify document when status is "idle"', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'someTask',
        status: 'idle',
      });

      expect(migration820(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('does not modify document when status is "failed"', () => {
      const migration820 = getMigrations()['8.2.0'];
      const taskInstance = getMockData({
        taskType: 'someTask',
        status: 'failed',
      });

      expect(migration820(taskInstance, migrationContext)).toEqual(taskInstance);
    });
  });

  describe('8.5.0', () => {
    test('adds enabled: true to tasks that are running, claiming, or idle', () => {
      const migration850 = getMigrations()['8.5.0'];
      const activeTasks = [
        getMockData({
          status: 'running',
        }),
        getMockData({
          status: 'claiming',
        }),
        getMockData({
          status: 'idle',
        }),
      ];
      activeTasks.forEach((task) => {
        expect(migration850(task, migrationContext)).toEqual({
          ...task,
          attributes: {
            ...task.attributes,
            enabled: true,
          },
        });
      });
    });

    test('does not modify tasks that are failed or unrecognized', () => {
      const migration850 = getMigrations()['8.5.0'];
      const inactiveTasks = [
        getMockData({
          status: 'failed',
        }),
        getMockData({
          status: 'unrecognized',
        }),
      ];
      inactiveTasks.forEach((task) => {
        expect(migration850(task, migrationContext)).toEqual(task);
      });
    });
  });

  describe('8.7.0', () => {
    const migration870 = getMigrations()['8.7.0'];

    describe('moves start/end/duration in alert state to meta', () => {
      const BaseRuleTaskState = {
        alertInstances: {
          alertA: {
            state: {
              start: '2023-01-18T14:59:57.596Z',
              duration: '1000000',
              stateField: '11',
            },
            meta: { metaField: 1 },
          },
          alertB: {
            state: {
              start: '2023-01-18T14:59:57.596Z',
              duration: '2000000',
              end: '2023-01-18T14:59:57.598Z',
              stateField: '22',
            },
            meta: { metaField: 2 },
          },
        },
        alertRecoveredInstances: {
          alertC: {
            state: {
              start: '2022-01-18T14:59:57.596Z',
              duration: '3000000',
              stateField: '33',
            },
            meta: { metaField: 3 },
          },
          alertD: {
            state: {
              start: '2022-01-18T14:59:57.596Z',
              duration: '4000000',
              end: '2022-01-18T14:59:57.600Z',
              stateField: '44',
            },
            meta: { metaField: 4 },
          },
        },
      };

      test('does not modify tasks that are not alerting tasks', () => {
        const oldTask = getMockData();
        expect(migration870(oldTask, migrationContext)).toBe(oldTask);
      });

      test('does not modify tasks that have no state', () => {
        const oldTask = getMockStateData();
        expect(migration870(oldTask, migrationContext)).toBe(oldTask);
      });

      test('modifies tasks that have meta, start, duration and optionally end', () => {
        const oldTask = getMockStateData(BaseRuleTaskState);

        const newTask = migration870(oldTask, migrationContext);

        const newState = JSON.parse(newTask.attributes.state);
        expect(newState).toMatchInlineSnapshot(`
          Object {
            "alertInstances": Object {
              "alertA": Object {
                "meta": Object {
                  "duration": "1000000",
                  "metaField": 1,
                  "start": "2023-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "1000000",
                  "start": "2023-01-18T14:59:57.596Z",
                  "stateField": "11",
                },
              },
              "alertB": Object {
                "meta": Object {
                  "duration": "2000000",
                  "end": "2023-01-18T14:59:57.598Z",
                  "metaField": 2,
                  "start": "2023-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "2000000",
                  "end": "2023-01-18T14:59:57.598Z",
                  "start": "2023-01-18T14:59:57.596Z",
                  "stateField": "22",
                },
              },
            },
            "alertRecoveredInstances": Object {
              "alertC": Object {
                "meta": Object {
                  "duration": "3000000",
                  "metaField": 3,
                  "start": "2022-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "3000000",
                  "start": "2022-01-18T14:59:57.596Z",
                  "stateField": "33",
                },
              },
              "alertD": Object {
                "meta": Object {
                  "duration": "4000000",
                  "end": "2022-01-18T14:59:57.600Z",
                  "metaField": 4,
                  "start": "2022-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "4000000",
                  "end": "2022-01-18T14:59:57.600Z",
                  "start": "2022-01-18T14:59:57.596Z",
                  "stateField": "44",
                },
              },
            },
          }
        `);
      });

      test('modifies tasks without alertInstances', () => {
        const state = JSON.parse(JSON.stringify(BaseRuleTaskState));
        delete state.alertInstances;
        delete state.alertRecoveredInstances.alertC;
        const oldTask = getMockStateData(state);

        const newTask = migration870(oldTask, migrationContext);

        const newState = JSON.parse(newTask.attributes.state);
        expect(newState).toMatchInlineSnapshot(`
          Object {
            "alertRecoveredInstances": Object {
              "alertD": Object {
                "meta": Object {
                  "duration": "4000000",
                  "end": "2022-01-18T14:59:57.600Z",
                  "metaField": 4,
                  "start": "2022-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "4000000",
                  "end": "2022-01-18T14:59:57.600Z",
                  "start": "2022-01-18T14:59:57.596Z",
                  "stateField": "44",
                },
              },
            },
          }
        `);
      });

      test('modifies tasks without alertRecoveredInstances', () => {
        const state = JSON.parse(JSON.stringify(BaseRuleTaskState));
        delete state.alertRecoveredInstances;
        delete state.alertInstances.alertA;
        const oldTask = getMockStateData(state);

        const newTask = migration870(oldTask, migrationContext);

        const newState = JSON.parse(newTask.attributes.state);
        expect(newState).toMatchInlineSnapshot(`
          Object {
            "alertInstances": Object {
              "alertB": Object {
                "meta": Object {
                  "duration": "2000000",
                  "end": "2023-01-18T14:59:57.598Z",
                  "metaField": 2,
                  "start": "2023-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "2000000",
                  "end": "2023-01-18T14:59:57.598Z",
                  "start": "2023-01-18T14:59:57.596Z",
                  "stateField": "22",
                },
              },
            },
          }
        `);
      });

      test('modifies alerting tasks that do not have meta', () => {
        const state = JSON.parse(JSON.stringify(BaseRuleTaskState));
        delete state.alertInstances.alertA.meta;
        delete state.alertInstances.alertB;
        delete state.alertRecoveredInstances.alertC.meta;
        delete state.alertRecoveredInstances.alertD;
        const oldTask = getMockStateData(state);

        const newTask = migration870(oldTask, migrationContext);

        const newState = JSON.parse(newTask.attributes.state);
        expect(newState).toMatchInlineSnapshot(`
          Object {
            "alertInstances": Object {
              "alertA": Object {
                "meta": Object {
                  "duration": "1000000",
                  "start": "2023-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "1000000",
                  "start": "2023-01-18T14:59:57.596Z",
                  "stateField": "11",
                },
              },
            },
            "alertRecoveredInstances": Object {
              "alertC": Object {
                "meta": Object {
                  "duration": "3000000",
                  "start": "2022-01-18T14:59:57.596Z",
                },
                "state": Object {
                  "duration": "3000000",
                  "start": "2022-01-18T14:59:57.596Z",
                  "stateField": "33",
                },
              },
            },
          }
        `);
      });
    });
  });
});

describe('handles errors during migrations', () => {
  describe('8.0.0 throws if migration fails', () => {
    test('should throw the exception if task instance params format is wrong', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123456',
        params: `{ spaceId: 'user1', customId: '123456' }`,
      });
      expect(() => {
        migration800(taskInstance, migrationContext);
      }).toThrowError();
      expect(migrationContext.log.error).toHaveBeenCalledWith(
        `savedObject 8.0.0 migration failed for task instance ${taskInstance.id} with error: Unexpected token s in JSON at position 2`,
        {
          migrations: {
            taskInstanceDocument: {
              ...taskInstance,
              attributes: {
                ...taskInstance.attributes,
              },
            },
          },
        }
      );
    });
  });
});

function getUpdatedAt(): string {
  const updatedAt = new Date();
  updatedAt.setHours(updatedAt.getHours() + 2);
  return updatedAt.toISOString();
}

function getMockData(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<Partial<TaskInstanceWithDeprecatedFields>> {
  return {
    attributes: {
      scheduledAt: new Date(),
      runAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(),
      ownerId: '234',
      taskType: 'foo',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      ...overwrites,
    },
    updated_at: getUpdatedAt(),
    id: uuidv4(),
    type: 'task',
  };
}

function getMockStateData(
  state?: Record<string, unknown>
): SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> {
  return {
    attributes: {
      scheduledAt: new Date().toISOString(),
      runAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      retryAt: new Date().toISOString(),
      ownerId: '234',
      taskType: 'alerting:foo',
      schedule: { interval: '10s' },
      params: JSON.stringify({ bar: true }),
      id: 'some id',
      attempts: 0,
      status: TaskStatus.Idle,
      traceparent: 'pappy',
      state: JSON.stringify(state),
    },
    updated_at: getUpdatedAt(),
    id: uuidv4(),
    type: 'task',
  };
}
