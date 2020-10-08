/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { getMigrations } from './migrations';
import { RawAction } from '../types';
import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { migrationMocks } from 'src/core/server/mocks';

const context = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

describe('7.10.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('add hasAuth config property for .email actions', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const action = getMockDataForEmail({});
    expect(migration710(action, context)).toMatchObject({
      ...action,
      attributes: {
        ...action.attributes,
        config: {
          hasAuth: true,
        },
      },
    });
  });

  test('rename cases configuration object', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const action = getMockData({});
    expect(migration710(action, context)).toMatchObject({
      ...action,
      attributes: {
        ...action.attributes,
        config: {
          incidentConfiguration: { mapping: [] },
        },
      },
    });
  });
});

function getMockDataForEmail(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<RawAction> {
  return {
    attributes: {
      name: 'abc',
      actionTypeId: '.email',
      config: {},
      secrets: { user: 'test', password: '123' },
      ...overwrites,
    },
    id: uuid.v4(),
    type: 'action',
  };
}

function getMockData(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<RawAction> {
  return {
    attributes: {
      name: 'abc',
      actionTypeId: '123',
      config: { casesConfiguration: { mapping: [] } },
      secrets: {},
      ...overwrites,
    },
    id: uuid.v4(),
    type: 'action',
  };
}
