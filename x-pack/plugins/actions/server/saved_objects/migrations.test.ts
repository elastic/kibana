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
const encryptedSavedObjectsSetupNoError = encryptedSavedObjectsMock.createSetup();
const encryptedSavedObjectsSetupThrowsError = encryptedSavedObjectsMock.createSetup();

beforeAll(() => {
  encryptedSavedObjectsSetupNoError.createMigration.mockImplementation((_, migration) => migration);
  encryptedSavedObjectsSetupThrowsError.createMigration.mockImplementation(() => () => {
    throw new Error(`Can't migrate!`);
  });
});

function testMigrationWhenNoEsoErrors(
  connector: SavedObjectUnsanitizedDoc<Partial<RawAction>>,
  expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>>,
  version: string
) {
  // should migrate correctly when no decrypt errors
  expect(
    getMigrations(encryptedSavedObjectsSetupNoError)[version](connector, context)
  ).toMatchObject(expectedMigratedConnector);
}

function testMigrationWhenEsoThrowsError(
  connector: SavedObjectUnsanitizedDoc<Partial<RawAction>>,
  expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>>,
  version: string
) {
  // should log error when decryption throws error but migrated correctly
  expect(
    getMigrations(encryptedSavedObjectsSetupThrowsError)[version](connector, context)
  ).toMatchObject(expectedMigratedConnector);
  expect(context.log.error).toHaveBeenCalledWith(
    `encryptedSavedObject ${version} migration failed for connector ${connector.id} with error: Can't migrate!`,
    {
      migrations: {
        connectorDocument: connector,
      },
    }
  );
}

describe('7.10.0', () => {
  test('add hasAuth config property for .email actions', () => {
    const connector = getMockDataForEmail({});
    const expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>> = {
      ...connector,
      attributes: {
        ...connector.attributes,
        config: {
          hasAuth: true,
        },
      },
    };

    testMigrationWhenNoEsoErrors(connector, expectedMigratedConnector, '7.10.0');
    testMigrationWhenEsoThrowsError(connector, expectedMigratedConnector, '7.10.0');
  });

  test('rename cases configuration object', () => {
    const connector = getCasesMockData({});
    const expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>> = {
      ...connector,
      attributes: {
        ...connector.attributes,
        config: {
          incidentConfiguration: { mapping: [] },
        },
      },
    };

    testMigrationWhenNoEsoErrors(connector, expectedMigratedConnector, '7.10.0');
    testMigrationWhenEsoThrowsError(connector, expectedMigratedConnector, '7.10.0');
  });
});

describe('7.11.0', () => {
  test('add hasAuth = true for .webhook actions with user and password', () => {
    const connector = getMockDataForWebhook({}, true);
    const expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>> = {
      ...connector,
      attributes: {
        ...connector.attributes,
        config: {
          hasAuth: true,
        },
      },
    };

    testMigrationWhenNoEsoErrors(connector, expectedMigratedConnector, '7.11.0');
    testMigrationWhenEsoThrowsError(connector, expectedMigratedConnector, '7.11.0');
  });

  test('add hasAuth = false for .webhook actions without user and password', () => {
    const connector = getMockDataForWebhook({}, false);
    const expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>> = {
      ...connector,
      attributes: {
        ...connector.attributes,
        config: {
          hasAuth: false,
        },
      },
    };

    testMigrationWhenNoEsoErrors(connector, expectedMigratedConnector, '7.11.0');
    testMigrationWhenEsoThrowsError(connector, expectedMigratedConnector, '7.11.0');
  });

  test('remove cases mapping object', () => {
    const connector = getMockData({
      config: { incidentConfiguration: { mapping: [] }, isCaseOwned: true, another: 'value' },
    });
    const expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>> = {
      ...connector,
      attributes: {
        ...connector.attributes,
        config: {
          another: 'value',
        },
      },
    };

    testMigrationWhenNoEsoErrors(connector, expectedMigratedConnector, '7.11.0');
    testMigrationWhenEsoThrowsError(connector, expectedMigratedConnector, '7.11.0');
  });
});

describe('7.14.0', () => {
  test('add isMissingSecrets property for actions', () => {
    const connector = getMockData({ isMissingSecrets: undefined });
    const expectedMigratedConnector: SavedObjectUnsanitizedDoc<Partial<RawAction>> = {
      ...connector,
      attributes: {
        ...connector.attributes,
        isMissingSecrets: false,
      },
    };

    testMigrationWhenNoEsoErrors(connector, expectedMigratedConnector, '7.14.0');
    testMigrationWhenEsoThrowsError(connector, expectedMigratedConnector, '7.14.0');
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
