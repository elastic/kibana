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

describe('7.9.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('changes nothing on alerts by other plugins', () => {
    const migration790 = getMigrations(encryptedSavedObjectsSetup)['7.9.0'];
    const alert = getMockData({});
    expect(migration790(alert, { log })).toMatchObject(alert);

    expect(encryptedSavedObjectsSetup.createMigration).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
  });

  test('migrates the consumer for alerting', () => {
    const migration790 = getMigrations(encryptedSavedObjectsSetup)['7.9.0'];
    const alert = getMockData({
      consumer: 'alerting',
    });
    expect(migration790(alert, { log })).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        consumer: 'alerts',
      },
    });
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
