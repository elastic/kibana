/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { FeaturesPlugin } from './plugin';

describe('Features Plugin', () => {
  let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let typeRegistry: ReturnType<typeof savedObjectsServiceMock.createTypeRegistryMock>;

  beforeEach(() => {
    initContext = coreMock.createPluginInitializerContext();
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();
    typeRegistry = savedObjectsServiceMock.createTypeRegistryMock();
    typeRegistry.getVisibleTypes.mockReturnValue([
      {
        name: 'foo',
        hidden: false,
        mappings: { properties: {} },
        namespaceType: 'single' as 'single',
      },
    ]);
    typeRegistry.getImportableAndExportableTypes.mockReturnValue([
      {
        name: 'hidden-importableAndExportable',
        hidden: true,
        mappings: { properties: {} },
        namespaceType: 'single' as 'single',
      },
      {
        name: 'not-hidden-importableAndExportable',
        hidden: false,
        mappings: { properties: {} },
        namespaceType: 'single' as 'single',
      },
    ]);
    coreStart.savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);
  });

  it('returns OSS + registered kibana features', async () => {
    const plugin = new FeaturesPlugin(initContext);
    const { registerKibanaFeature: registerFeature } = await plugin.setup(coreSetup);
    registerFeature({
      id: 'baz',
      name: 'baz',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: null,
    });

    const { getKibanaFeatures } = plugin.start(coreStart);

    expect(getKibanaFeatures().map((f) => f.id)).toMatchInlineSnapshot(`
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

  it('registers kibana features with visible saved objects types and hidden saved object types that are importable and exportable', async () => {
    typeRegistry.isHidden.mockReturnValueOnce(true);
    typeRegistry.isHidden.mockReturnValueOnce(false);
    const plugin = new FeaturesPlugin(initContext);
    await plugin.setup(coreSetup);
    const { getKibanaFeatures } = plugin.start(coreStart);

    const soTypes =
      getKibanaFeatures().find((f) => f.id === 'savedObjectsManagement')?.privileges?.all
        .savedObject.all || [];

    expect(soTypes.includes('foo')).toBe(true);
    expect(soTypes.includes('bar')).toBe(false);
    expect(soTypes.includes('hidden-importableAndExportable')).toBe(true);
    expect(soTypes.includes('not-hidden-importableAndExportable')).toBe(false);
  });

  it('returns registered elasticsearch features', async () => {
    const plugin = new FeaturesPlugin(initContext);
    const { registerElasticsearchFeature } = await plugin.setup(coreSetup);
    registerElasticsearchFeature({
      id: 'baz',
      privileges: [
        {
          requiredClusterPrivileges: ['all'],
          ui: ['baz-ui'],
        },
      ],
    });

    const { getElasticsearchFeatures } = plugin.start(coreStart);

    expect(getElasticsearchFeatures().map((f) => f.id)).toMatchInlineSnapshot(`
      Array [
        "baz",
      ]
    `);
  });

  it('registers a capabilities provider', async () => {
    const plugin = new FeaturesPlugin(initContext);
    await plugin.setup(coreSetup);

    expect(coreSetup.capabilities.registerProvider).toHaveBeenCalledTimes(1);
    expect(coreSetup.capabilities.registerProvider).toHaveBeenCalledWith(expect.any(Function));
  });
});
