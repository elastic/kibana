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
        params: { spaceId: 'user1', actionTaskParamsId: '123456' },
      });

      expect(migration800(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          params: {
            ...taskInstance.attributes.params,
            actionTaskParamsId: '800f81f8-980e-58ca-b710-d1b0644adea2',
          },
        },
      });
    });

    test('it is only applicable for saved objects that live in a custom space', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'actions:123456',
        params: { spaceId: 'default', actionTaskParamsId: '123456' },
      });

      expect(migration800(taskInstance, migrationContext)).toEqual(taskInstance);
    });

    test('transforms alertingTaskLegacyIdToSavedObjectIds', () => {
      const migration800 = getMigrations()['8.0.0'];
      const taskInstance = getMockData({
        taskType: 'alerting:123456',
        params: { spaceId: 'user1', alertId: '123456' },
      });

      expect(migration800(taskInstance, migrationContext)).toEqual({
        ...taskInstance,
        attributes: {
          ...taskInstance.attributes,
          params: {
            ...taskInstance.attributes.params,
            alertId: '1a4f9206-e25f-58e6-bad5-3ff21e90648e',
          },
        },
      });
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
