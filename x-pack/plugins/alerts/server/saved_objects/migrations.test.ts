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

function getMockData(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<RawAlert> {
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
    id: uuid.v4(),
    type: 'alert',
  };
}
