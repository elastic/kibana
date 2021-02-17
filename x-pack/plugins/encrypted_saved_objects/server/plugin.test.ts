/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EncryptedSavedObjectsPlugin } from './plugin';
import { ConfigSchema } from './config';

import { coreMock } from 'src/core/server/mocks';
import { securityMock } from '../../security/server/mocks';

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
      const plugin = new EncryptedSavedObjectsPlugin(
        coreMock.createPluginInitializerContext(
          ConfigSchema.validate({ encryptionKey: 'z'.repeat(32) }, { dist: true })
        )
      );
      expect(plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() }))
        .toMatchInlineSnapshot(`
        Object {
          "canEncrypt": true,
          "createMigration": [Function],
          "registerType": [Function],
        }
      `);
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
                "getDecryptedAsInternalUser": [Function],
              }
            `);
    });
  });
});
