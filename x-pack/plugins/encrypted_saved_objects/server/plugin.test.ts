/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { ConfigSchema } from './config';
import { EncryptedSavedObjectsPlugin } from './plugin';

describe('EncryptedSavedObjects Plugin', () => {
  describe('setup()', () => {
    it('exposes proper contract', () => {
      const plugin = new EncryptedSavedObjectsPlugin(
        coreMock.createPluginInitializerContext(ConfigSchema.validate({}, { dist: true }))
      );
      expect(plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() }))
        .toMatchInlineSnapshot(`
        Object {
          "canEncrypt": false,
          "createMigration": [Function],
          "registerType": [Function],
        }
      `);
    });

    it('exposes proper contract when encryption key is set', () => {
      const mockInitializerContext = coreMock.createPluginInitializerContext(
        ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
      );

      const plugin = new EncryptedSavedObjectsPlugin(mockInitializerContext);

      expect(plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() }))
        .toMatchInlineSnapshot(`
        Object {
          "canEncrypt": true,
          "createMigration": [Function],
          "registerType": [Function],
        }
      `);

      const infoLogs = loggingSystemMock.collect(mockInitializerContext.logger).info;

      expect(infoLogs.length).toBe(1);
      expect(infoLogs[0]).toEqual([
        `Hashed 'xpack.encryptedSavedObjects.encryptionKey' for this instance: WLbjNGKEm7aA4NfJHYyW88jHUkHtyF7ENHcF0obYGBU=`,
      ]);
    });
  });

  describe('start()', () => {
    it('exposes proper contract', () => {
      const plugin = new EncryptedSavedObjectsPlugin(
        coreMock.createPluginInitializerContext(ConfigSchema.validate({}, { dist: true }))
      );
      plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });

      const startContract = plugin.start();
      expect(startContract).toMatchInlineSnapshot(`
              Object {
                "getClient": [Function],
                "isEncryptionError": [Function],
              }
            `);

      expect(startContract.getClient()).toMatchInlineSnapshot(`
        Object {
          "createPointInTimeFinderDecryptedAsInternalUser": [Function],
          "getDecryptedAsInternalUser": [Function],
        }
      `);
    });
  });
});
