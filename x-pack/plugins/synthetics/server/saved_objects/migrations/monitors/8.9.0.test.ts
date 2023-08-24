/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { migrationMocks } from '@kbn/core/server/mocks';
import { ConfigKey } from '../../../../common/runtime_types';
import { browserUI } from './test_fixtures/8.7.0';
import { httpUI as httpUI850 } from './test_fixtures/8.5.0';
import { migration890 } from './8.9.0';

const context = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

describe('Monitor migrations v8.8.0 -> v8.9.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(({ migration }) => migration);
  });

  describe('alerting config', () => {
    it('sets alerting config when it is not defined', () => {
      expect(httpUI850.attributes[ConfigKey.ALERT_CONFIG]).toBeUndefined();
      const actual = migration890(encryptedSavedObjectsSetup)(httpUI850, context);
      expect(actual.attributes[ConfigKey.ALERT_CONFIG]).toEqual({
        status: {
          enabled: true,
        },
        tls: {
          enabled: true,
        },
      });
    });

    it('uses existing alerting config when it is defined', () => {
      const testMonitor = {
        ...browserUI,
        attributes: {
          ...browserUI.attributes,
          [ConfigKey.ALERT_CONFIG]: {
            status: {
              enabled: false,
            },
            tls: {
              enabled: true,
            },
          },
        },
      };
      expect(testMonitor.attributes[ConfigKey.ALERT_CONFIG]).toBeTruthy();
      const actual = migration890(encryptedSavedObjectsSetup)(testMonitor, context);
      expect(actual.attributes[ConfigKey.ALERT_CONFIG]).toEqual({
        status: {
          enabled: false,
        },
        tls: {
          enabled: true,
        },
      });
    });

    it('uses existing alerting config when it already exists', () => {
      const testMonitor = {
        ...browserUI,
        attributes: {
          ...browserUI.attributes,
          [ConfigKey.ALERT_CONFIG]: {
            status: {
              enabled: false,
            },
          },
        },
      };
      expect(testMonitor.attributes[ConfigKey.ALERT_CONFIG]).toBeTruthy();
      const actual = migration890(encryptedSavedObjectsSetup)(testMonitor, context);
      expect(actual.attributes[ConfigKey.ALERT_CONFIG]).toEqual({
        status: {
          enabled: false,
        },
        tls: {
          enabled: true,
        },
      });
    });
  });
});
