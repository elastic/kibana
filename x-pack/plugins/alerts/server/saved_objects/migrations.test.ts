/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { getMigrations } from './migrations';
import { RawAlert } from '../types';
import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { migrationMocks } from 'src/core/server/mocks';

const { log } = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

describe('7.10.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('marks alerts as legacy', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({});
    expect(migration710(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates the consumer for metrics', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'metrics',
    });
    expect(migration710(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        consumer: 'infrastructure',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates the consumer for siem', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'securitySolution',
    });
    expect(migration710(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        consumer: 'siem',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates the consumer for alerting', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'alerting',
    });
    expect(migration710(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        consumer: 'alerts',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates PagerDuty actions to set a default dedupkey of the AlertId', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'resolve',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    expect(migration710(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
            params: {
              summary: 'fired {{alertInstanceId}}',
              eventAction: 'resolve',
              dedupKey: '{{alertId}}',
              component: '',
            },
            id: 'b62ea790-5366-4abc-a7df-33db1db78410',
          },
        ],
      },
    });
  });

  test('skips PagerDuty actions with a specified dedupkey', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'trigger',
            dedupKey: '{{alertInstanceId}}',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    expect(migration710(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
            params: {
              summary: 'fired {{alertInstanceId}}',
              eventAction: 'trigger',
              dedupKey: '{{alertInstanceId}}',
              component: '',
            },
            id: 'b62ea790-5366-4abc-a7df-33db1db78410',
          },
        ],
      },
    });
  });

  test('skips PagerDuty actions with an eventAction of "trigger"', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'trigger',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    expect(migration710(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
            params: {
              summary: 'fired {{alertInstanceId}}',
              eventAction: 'trigger',
              component: '',
            },
            id: 'b62ea790-5366-4abc-a7df-33db1db78410',
          },
        ],
      },
    });
  });

  test('creates execution status', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData();
    const dateStart = Date.now();
    const migratedAlert = migration710(alert, { log });
    const dateStop = Date.now();
    const dateExecutionStatus = Date.parse(
      migratedAlert.attributes.executionStatus.lastExecutionDate
    );

    expect(dateStart).toBeLessThanOrEqual(dateExecutionStatus);
    expect(dateStop).toBeGreaterThanOrEqual(dateExecutionStatus);

    expect(migratedAlert).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        executionStatus: {
          lastExecutionDate: migratedAlert.attributes.executionStatus.lastExecutionDate,
          status: 'pending',
          error: null,
        },
      },
    });
  });
});

describe('7.10.0 migrates with failure', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementationOnce(() => () => {
      throw new Error(`Can't migrate!`);
    });
  });

  test('should show the proper exception', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'alerting',
    });
    const res = migration710(alert, { log });
    expect(res).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
      },
    });
    expect(log.error).toHaveBeenCalledWith(
      `encryptedSavedObject 7.10.0 migration failed for alert ${alert.id} with error: Can't migrate!`,
      {
        alertDocument: {
          ...alert,
          attributes: {
            ...alert.attributes,
          },
        },
      }
    );
  });
});

describe('7.11.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('add updatedAt field to alert - set to SavedObject updated_at attribute', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const alert = getMockData({}, true);
    expect(migration711(alert, { log })).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        updatedAt: alert.updated_at,
        notifyOnlyOnActionGroupChange: false,
      },
    });
  });

  test('add updatedAt field to alert - set to createdAt when SavedObject updated_at is not defined', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const alert = getMockData({});
    expect(migration711(alert, { log })).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        updatedAt: alert.attributes.createdAt,
        notifyOnlyOnActionGroupChange: false,
      },
    });
  });

  test('add notifyOnlyOnActionGroupChange field - default to false', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const alert = getMockData({});
    expect(migration711(alert, { log })).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        updatedAt: alert.attributes.createdAt,
        notifyOnlyOnActionGroupChange: false,
      },
    });
  });
});

function getUpdatedAt(): string {
  const updatedAt = new Date();
  updatedAt.setHours(updatedAt.getHours() + 2);
  return updatedAt.toISOString();
}

function getMockData(
  overwrites: Record<string, unknown> = {},
  withSavedObjectUpdatedAt: boolean = false
): SavedObjectUnsanitizedDoc<Partial<RawAlert>> {
  return {
    attributes: {
      enabled: true,
      name: 'abc',
      tags: ['foo'],
      alertTypeId: '123',
      consumer: 'bar',
      apiKey: '',
      apiKeyOwner: '',
      schedule: { interval: '10s' },
      throttle: null,
      params: {
        bar: true,
      },
      muteAll: false,
      mutedInstanceIds: [],
      createdBy: new Date().toISOString(),
      updatedBy: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      actions: [
        {
          group: 'default',
          actionRef: '1',
          actionTypeId: '1',
          params: {
            foo: true,
          },
        },
      ],
      ...overwrites,
    },
    updated_at: withSavedObjectUpdatedAt ? getUpdatedAt() : undefined,
    id: uuid.v4(),
    type: 'alert',
  };
}
