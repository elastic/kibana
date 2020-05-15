/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from './plugin';

import { coreMock } from 'src/core/server/mocks';
import { securityMock } from '../../security/server/mocks';

describe('EncryptedSavedObjects Plugin', () => {
  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const plugin = new Plugin(coreMock.createPluginInitializerContext());
      await expect(plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() }))
        .resolves.toMatchInlineSnapshot(`
              Object {
                "__legacyCompat": Object {
                  "registerLegacyAPI": [Function],
                },
                "registerType": [Function],
                "startWithHiddenTypes": [Function],
                "usingEphemeralEncryptionKey": true,
              }
            `);
    });

    it('exposes a start contract with included hidden types', async () => {
      const plugin = new Plugin(coreMock.createPluginInitializerContext());
      const startApiWithHiddenTypes = (
        await plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() })
      ).startWithHiddenTypes(['hiddenType']);
      expect(startApiWithHiddenTypes).toMatchInlineSnapshot(`
              Object {
                "getDecryptedAsInternalUser": [Function],
                "isEncryptionError": [Function],
              }
            `);
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      const plugin = new Plugin(coreMock.createPluginInitializerContext());
      await plugin.setup(coreMock.createSetup(), { security: securityMock.createSetup() });
      await expect(plugin.start()).toMatchInlineSnapshot(`
              Object {
                "getDecryptedAsInternalUser": [Function],
                "isEncryptionError": [Function],
              }
            `);
    });
  });
});
