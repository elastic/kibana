/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from './plugin';

import { coreMock } from 'src/core/server/mocks';

describe('EncryptedSavedObjects Plugin', () => {
  describe('setup()', () => {
    it('exposes proper contract', async () => {
      const plugin = new Plugin(coreMock.createPluginInitializerContext());
      await expect(plugin.setup(coreMock.createSetup())).resolves.toMatchInlineSnapshot(`
              Object {
                "__legacyCompat": Object {
                  "registerLegacyAPI": [Function],
                },
                "registerType": [Function],
              }
            `);
    });
  });

  describe('start()', () => {
    it('exposes proper contract', async () => {
      const plugin = new Plugin(coreMock.createPluginInitializerContext());
      await plugin.setup(coreMock.createSetup());
      await expect(plugin.start()).toMatchInlineSnapshot(`
              Object {
                "getDecryptedAsInternalUser": [Function],
                "isEncryptionError": [Function],
              }
            `);
    });
  });
});
