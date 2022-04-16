/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { getActionsMigrations } from './actions_migrations';
import { RawAction } from '../types';
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { migrationMocks } from '@kbn/core/server/mocks';

const context = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

describe('successful migrations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(({ migration }) => migration);
  });

  describe('7.10.0', () => {
    test('add hasAuth config property for .email actions', () => {
      const migration710 = getActionsMigrations(encryptedSavedObjectsSetup)['7.10.0'];
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
      const migration710 = getActionsMigrations(encryptedSavedObjectsSetup)['7.10.0'];
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
    test('add hasAuth = true for .webhook actions with user and password', () => {
      const migration711 = getActionsMigrations(encryptedSavedObjectsSetup)['7.11.0'];
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
      const migration711 = getActionsMigrations(encryptedSavedObjectsSetup)['7.11.0'];
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
      const migration711 = getActionsMigrations(encryptedSavedObjectsSetup)['7.11.0'];
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
    test('add isMissingSecrets property for actions', () => {
      const migration714 = getActionsMigrations(encryptedSavedObjectsSetup)['7.14.0'];
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

  describe('7.16.0', () => {
    test('set service config property for .email connectors if service is undefined', () => {
      const migration716 = getActionsMigrations(encryptedSavedObjectsSetup)['7.16.0'];
      const action = getMockDataForEmail({ config: { service: undefined } });
      const migratedAction = migration716(action, context);
      expect(migratedAction.attributes.config).toEqual({
        service: 'other',
      });
      expect(migratedAction).toEqual({
        ...action,
        attributes: {
          ...action.attributes,
          config: {
            service: 'other',
          },
        },
      });
    });

    test('set service config property for .email connectors if service is null', () => {
      const migration716 = getActionsMigrations(encryptedSavedObjectsSetup)['7.16.0'];
      const action = getMockDataForEmail({ config: { service: null } });
      const migratedAction = migration716(action, context);
      expect(migratedAction.attributes.config).toEqual({
        service: 'other',
      });
      expect(migratedAction).toEqual({
        ...action,
        attributes: {
          ...action.attributes,
          config: {
            service: 'other',
          },
        },
      });
    });

    test('skips migrating .email connectors if service is defined, even if value is nonsense', () => {
      const migration716 = getActionsMigrations(encryptedSavedObjectsSetup)['7.16.0'];
      const action = getMockDataForEmail({ config: { service: 'gobbledygook' } });
      const migratedAction = migration716(action, context);
      expect(migratedAction.attributes.config).toEqual({
        service: 'gobbledygook',
      });
      expect(migratedAction).toEqual(action);
    });

    test('set usesTableApi config property for .servicenow', () => {
      const migration716 = getActionsMigrations(encryptedSavedObjectsSetup)['7.16.0'];
      const action = getMockDataForServiceNow();
      const migratedAction = migration716(action, context);

      expect(migratedAction).toEqual({
        ...action,
        attributes: {
          ...action.attributes,
          config: {
            apiUrl: 'https://example.com',
            usesTableApi: true,
          },
        },
      });
    });

    test('set usesTableApi config property for .servicenow-sir', () => {
      const migration716 = getActionsMigrations(encryptedSavedObjectsSetup)['7.16.0'];
      const action = getMockDataForServiceNow({ actionTypeId: '.servicenow-sir' });
      const migratedAction = migration716(action, context);

      expect(migratedAction).toEqual({
        ...action,
        attributes: {
          ...action.attributes,
          config: {
            apiUrl: 'https://example.com',
            usesTableApi: true,
          },
        },
      });
    });

    test('it does not set usesTableApi config for other connectors', () => {
      const migration716 = getActionsMigrations(encryptedSavedObjectsSetup)['7.16.0'];
      const action = getMockData();
      const migratedAction = migration716(action, context);
      expect(migratedAction).toEqual(action);
    });
  });

  describe('8.0.0', () => {
    test('no op migration for rules SO', () => {
      const migration800 = getActionsMigrations(encryptedSavedObjectsSetup)['8.0.0'];
      const action = getMockData({});
      expect(migration800(action, context)).toEqual(action);
    });
  });
});

describe('handles errors during migrations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(() => () => {
      throw new Error(`Can't migrate!`);
    });
  });

  describe('7.10.0 throws if migration fails', () => {
    test('should show the proper exception', () => {
      const migration710 = getActionsMigrations(encryptedSavedObjectsSetup)['7.10.0'];
      const action = getMockDataForEmail({});
      expect(() => {
        migration710(action, context);
      }).toThrowError(`Can't migrate!`);
      expect(context.log.error).toHaveBeenCalledWith(
        `encryptedSavedObject 7.10.0 migration failed for action ${action.id} with error: Can't migrate!`,
        {
          migrations: {
            actionDocument: action,
          },
        }
      );
    });
  });

  describe('7.11.0 throws if migration fails', () => {
    test('should show the proper exception', () => {
      const migration711 = getActionsMigrations(encryptedSavedObjectsSetup)['7.11.0'];
      const action = getMockDataForEmail({});
      expect(() => {
        migration711(action, context);
      }).toThrowError(`Can't migrate!`);
      expect(context.log.error).toHaveBeenCalledWith(
        `encryptedSavedObject 7.11.0 migration failed for action ${action.id} with error: Can't migrate!`,
        {
          migrations: {
            actionDocument: action,
          },
        }
      );
    });
  });

  describe('7.14.0 throws if migration fails', () => {
    test('should show the proper exception', () => {
      const migration714 = getActionsMigrations(encryptedSavedObjectsSetup)['7.14.0'];
      const action = getMockDataForEmail({});
      expect(() => {
        migration714(action, context);
      }).toThrowError(`Can't migrate!`);
      expect(context.log.error).toHaveBeenCalledWith(
        `encryptedSavedObject 7.14.0 migration failed for action ${action.id} with error: Can't migrate!`,
        {
          migrations: {
            actionDocument: action,
          },
        }
      );
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

function getMockDataForServiceNow(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<Omit<RawAction, 'isMissingSecrets'>> {
  return {
    attributes: {
      name: 'abc',
      actionTypeId: '.servicenow',
      config: { apiUrl: 'https://example.com' },
      secrets: { user: 'test', password: '123' },
      ...overwrites,
    },
    id: uuid.v4(),
    type: 'action',
  };
}
