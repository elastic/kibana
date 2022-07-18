/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';

import type { PluginsStart } from './plugin';
import { SpacesPlugin } from './plugin';

describe('Spaces plugin', () => {
  describe('#setup', () => {
    it('can setup with all optional plugins disabled, exposing the expected contract', () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const plugin = new SpacesPlugin(initializerContext);
      const spacesSetup = plugin.setup(core, { features, licensing });
      expect(spacesSetup).toMatchInlineSnapshot(`
        Object {
          "spacesClient": Object {
            "registerClientWrapper": [Function],
            "setClientRepositoryFactory": [Function],
          },
          "spacesService": Object {
            "getSpaceId": [Function],
            "namespaceToSpaceId": [Function],
            "spaceIdToNamespace": [Function],
          },
        }
      `);
    });

    it('registers the capabilities provider and switcher', () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const plugin = new SpacesPlugin(initializerContext);

      plugin.setup(core, { features, licensing });

      expect(core.capabilities.registerProvider).toHaveBeenCalledTimes(1);
      expect(core.capabilities.registerSwitcher).toHaveBeenCalledTimes(1);
    });

    it('registers the usage collector', () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const usageCollection = usageCollectionPluginMock.createSetupContract();

      const plugin = new SpacesPlugin(initializerContext);

      plugin.setup(core, { features, licensing, usageCollection });

      expect(usageCollection.getCollectorByType('spaces')).toBeDefined();
    });

    it('registers the "space" saved object type and client wrapper', () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const plugin = new SpacesPlugin(initializerContext);

      plugin.setup(core, { features, licensing });

      expect(core.savedObjects.registerType).toHaveBeenCalledWith({
        name: 'space',
        namespaceType: 'agnostic',
        hidden: true,
        mappings: expect.any(Object),
        migrations: expect.any(Object),
      });

      expect(core.savedObjects.addClientWrapper).toHaveBeenCalledWith(
        Number.MIN_SAFE_INTEGER,
        'spaces',
        expect.any(Function)
      );
    });
  });

  describe('#start', () => {
    it('can start with all optional plugins disabled, exposing the expected contract', () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const coreSetup = coreMock.createSetup() as CoreSetup<PluginsStart>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const plugin = new SpacesPlugin(initializerContext);
      plugin.setup(coreSetup, { features, licensing });

      const coreStart = coreMock.createStart();

      const spacesStart = plugin.start(coreStart);
      expect(spacesStart).toMatchInlineSnapshot(`
        Object {
          "spacesService": Object {
            "createSpacesClient": [Function],
            "getActiveSpace": [Function],
            "getSpaceId": [Function],
            "isInDefaultSpace": [Function],
            "namespaceToSpaceId": [Function],
            "spaceIdToNamespace": [Function],
          },
        }
      `);
    });
  });
});
