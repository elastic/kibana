/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { coreMock, savedObjectsServiceMock } from 'src/core/server/mocks';

import { Plugin } from './plugin';
const initContext = coreMock.createPluginInitializerContext();
const coreSetup = coreMock.createSetup();
const coreStart = coreMock.createStart();
const typeRegistry = savedObjectsServiceMock.createTypeRegistryMock();
typeRegistry.getVisibleTypes.mockReturnValue([
  {
    name: 'foo',
    hidden: false,
    mappings: { properties: {} },
    namespaceType: 'single' as 'single',
  },
]);
coreStart.savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);

describe('Features Plugin', () => {
  it('returns OSS + registered features', async () => {
    const plugin = new Plugin(initContext);
    const { registerFeature } = await plugin.setup(coreSetup, {});
    registerFeature({
      id: 'baz',
      name: 'baz',
      app: [],
      privileges: null,
    });

    const { getFeatures } = await plugin.start(coreStart);

    expect(getFeatures().map((f) => f.id)).toMatchInlineSnapshot(`
      Array [
        "baz",
        "discover",
        "visualize",
        "dashboard",
        "dev_tools",
        "advancedSettings",
        "indexPatterns",
        "savedObjectsManagement",
      ]
    `);
  });

  it('returns OSS + registered features with timelion when available', async () => {
    const plugin = new Plugin(initContext);
    const { registerFeature } = await plugin.setup(coreSetup, {
      visTypeTimelion: { uiEnabled: true },
    });
    registerFeature({
      id: 'baz',
      name: 'baz',
      app: [],
      privileges: null,
    });

    const { getFeatures } = await plugin.start(coreStart);

    expect(getFeatures().map((f) => f.id)).toMatchInlineSnapshot(`
      Array [
        "baz",
        "discover",
        "visualize",
        "dashboard",
        "dev_tools",
        "advancedSettings",
        "indexPatterns",
        "savedObjectsManagement",
        "timelion",
      ]
    `);
  });

  it('registers not hidden saved objects types', async () => {
    const plugin = new Plugin(initContext);
    await plugin.setup(coreSetup, {});
    const { getFeatures } = await plugin.start(coreStart);

    const soTypes =
      getFeatures().find((f) => f.id === 'savedObjectsManagement')?.privileges?.all.savedObject
        .all || [];

    expect(soTypes.includes('foo')).toBe(true);
    expect(soTypes.includes('bar')).toBe(false);
  });
});
