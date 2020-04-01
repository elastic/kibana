/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { coreMock } from 'src/core/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { Plugin, PluginsSetup } from './plugin';
import { usageCollectionPluginMock } from '../../../../src/plugins/usage_collection/server/mocks';

describe('Spaces Plugin', () => {
  describe('#setup', () => {
    it('can setup with all optional plugins disabled, exposing the expected contract', async () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsSetup>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const plugin = new Plugin(initializerContext);
      const spacesSetup = await plugin.setup(core, { features, licensing });
      expect(spacesSetup).toMatchInlineSnapshot(`
        Object {
          "__legacyCompat": Object {
            "createDefaultSpace": [Function],
            "registerLegacyAPI": [Function],
          },
          "spacesService": Object {
            "getActiveSpace": [Function],
            "getBasePath": [Function],
            "getSpaceId": [Function],
            "isInDefaultSpace": [Function],
            "namespaceToSpaceId": [Function],
            "scopedClient": [Function],
            "spaceIdToNamespace": [Function],
          },
        }
      `);
    });

    it('registers the capabilities provider and switcher', async () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsSetup>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const plugin = new Plugin(initializerContext);

      await plugin.setup(core, { features, licensing });

      expect(core.capabilities.registerProvider).toHaveBeenCalledTimes(1);
      expect(core.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    });

    it('registers the usage collector', async () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsSetup>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const usageCollection = usageCollectionPluginMock.createSetupContract();

      const plugin = new Plugin(initializerContext);

      await plugin.setup(core, { features, licensing, usageCollection });

      expect(usageCollection.getCollectorByType('spaces')).toBeDefined();
    });
  });
});
