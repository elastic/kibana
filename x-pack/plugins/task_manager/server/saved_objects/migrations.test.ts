/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { getMigrations } from './migrations';
import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { migrationMocks } from 'src/core/server/mocks';
import { TaskInstanceWithDeprecatedFields } from '../task';

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
      state: { runs: 0, total_cleaned_up: 0 },
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
    id: uuid.v4(),
    type: 'task',
  };
}
