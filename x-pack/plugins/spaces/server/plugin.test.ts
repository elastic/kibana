/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';

import { createDefaultSpace } from './default_space/create_default_space';
import type { PluginsStart } from './plugin';
import { SpacesPlugin } from './plugin';

jest.mock('./default_space/create_default_space');

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
          "hasOnlyDefaultSpace$": Observable {
            "operator": [Function],
            "source": Observable {
              "operator": [Function],
              "source": Observable {
                "_subscribe": [Function],
              },
            },
          },
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

    // Joe removed this test, but we're not sure why...
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

    it('registers the usage collector if the usageCollection plugin is enabled', () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();

      const usageCollection = usageCollectionPluginMock.createSetupContract();

      const plugin = new SpacesPlugin(initializerContext);

      plugin.setup(core, { features, licensing, usageCollection });

      expect(usageCollection.getCollectorByType('spaces')).toBeDefined();
    });

    it('can setup space with default solution', async () => {
      const initializerContext = coreMock.createPluginInitializerContext({ maxSpaces: 1000 });
      const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
      const features = featuresPluginMock.createSetup();
      const licensing = licensingMock.createSetup();
      const cloud = {
        ...cloudMock.createSetup(),
        apm: {},
        onboarding: { defaultSolution: 'security' },
      } as CloudSetup;

      const plugin = new SpacesPlugin(initializerContext);
      plugin.setup(core, { features, licensing, cloud });

      expect(createDefaultSpace).toHaveBeenCalledWith(
        expect.objectContaining({ solution: 'security' })
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

      const spacesStart = plugin.start(coreStart, { features: featuresPluginMock.createStart() });
      expect(spacesStart).toMatchInlineSnapshot(`
        Object {
          "hasOnlyDefaultSpace$": Observable {
            "operator": [Function],
            "source": Observable {
              "operator": [Function],
              "source": Observable {
                "_subscribe": [Function],
              },
            },
          },
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

  it('determines hasOnlyDefaultSpace$ correctly when maxSpaces=1', async () => {
    const initializerContext = coreMock.createPluginInitializerContext({ maxSpaces: 1 });
    const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
    const features = featuresPluginMock.createSetup();
    const licensing = licensingMock.createSetup();

    const usageCollection = usageCollectionPluginMock.createSetupContract();

    const plugin = new SpacesPlugin(initializerContext);

    const spacesSetup = plugin.setup(core, { features, licensing, usageCollection });
    const coreStart = coreMock.createStart();
    const spacesStart = plugin.start(coreStart, { features: featuresPluginMock.createStart() });

    await expect(firstValueFrom(spacesSetup.hasOnlyDefaultSpace$)).resolves.toEqual(true);
    await expect(firstValueFrom(spacesStart.hasOnlyDefaultSpace$)).resolves.toEqual(true);
  });

  it('determines hasOnlyDefaultSpace$ correctly when maxSpaces=1000', async () => {
    const initializerContext = coreMock.createPluginInitializerContext({ maxSpaces: 1000 });
    const core = coreMock.createSetup() as CoreSetup<PluginsStart>;
    const features = featuresPluginMock.createSetup();
    const licensing = licensingMock.createSetup();

    const usageCollection = usageCollectionPluginMock.createSetupContract();

    const plugin = new SpacesPlugin(initializerContext);

    const spacesSetup = plugin.setup(core, { features, licensing, usageCollection });
    const coreStart = coreMock.createStart();
    const spacesStart = plugin.start(coreStart, { features: featuresPluginMock.createStart() });

    await expect(firstValueFrom(spacesSetup.hasOnlyDefaultSpace$)).resolves.toEqual(false);
    await expect(firstValueFrom(spacesStart.hasOnlyDefaultSpace$)).resolves.toEqual(false);
  });
});
