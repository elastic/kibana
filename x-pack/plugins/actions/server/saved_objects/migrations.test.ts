/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    const migratedAction = migration710(action, context);
    expect(migratedAction.attributes.config).toEqual({
      hasAuth: true,
    });
    expect(migratedAction).toEqual({
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
    const action = getCasesMockData({});
    const migratedAction = migration710(action, context);
    expect(migratedAction.attributes.config).toEqual({
      incidentConfiguration: { mapping: [] },
    });
    expect(migratedAction).toEqual({
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

describe('7.11.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('add hasAuth = true for .webhook actions with user and password', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const action = getMockDataForWebhook({}, true);
    expect(migration711(action, context)).toMatchObject({
      ...action,
      attributes: {
        ...action.attributes,
        config: {
          hasAuth: true,
        },
      },
    });
  });

  test('add hasAuth = false for .webhook actions without user and password', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const action = getMockDataForWebhook({}, false);
    expect(migration711(action, context)).toMatchObject({
      ...action,
      attributes: {
        ...action.attributes,
        config: {
          hasAuth: false,
        },
      },
    });
  });
  test('remove cases mapping object', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const action = getMockData({
      config: { incidentConfiguration: { mapping: [] }, isCaseOwned: true, another: 'value' },
    });
    expect(migration711(action, context)).toEqual({
      ...action,
      attributes: {
        ...action.attributes,
        config: {
          another: 'value',
        },
      },
    });
  });
});

describe('7.14.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('add isMissingSecrets property for actions', () => {
    const migration714 = getMigrations(encryptedSavedObjectsSetup)['7.14.0'];
    const action = getMockData({ isMissingSecrets: undefined });
    const migratedAction = migration714(action, context);
    expect(migratedAction).toEqual({
      ...action,
      attributes: {
        ...action.attributes,
        isMissingSecrets: false,
      },
    });
  });
});

function getMockDataForWebhook(
  overwrites: Record<string, unknown> = {},
  hasUserAndPassword: boolean
): SavedObjectUnsanitizedDoc<Omit<RawAction, 'isMissingSecrets'>> {
  const secrets = hasUserAndPassword
    ? { user: 'test', password: '123' }
    : { user: '', password: '' };
  return {
    attributes: {
      name: 'abc',
      actionTypeId: '.webhook',
      config: {},
      secrets,
      ...overwrites,
    },
    id: uuid.v4(),
    type: 'action',
  };
}

function getMockDataForEmail(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<Omit<RawAction, 'isMissingSecrets'>> {
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

function getCasesMockData(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<Omit<RawAction, 'isMissingSecrets'>> {
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

function getMockData(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<Omit<RawAction, 'isMissingSecrets'>> {
  return {
    attributes: {
      name: 'abc',
      actionTypeId: '123',
      config: {},
      secrets: {},
      ...overwrites,
    },
    id: uuid.v4(),
    type: 'action',
  };
}
