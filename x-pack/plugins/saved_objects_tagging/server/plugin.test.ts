/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerRoutesMock, createTagUsageCollectorMock } from './plugin.test.mocks';

import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { SavedObjectTaggingPlugin } from './plugin';
import { savedObjectsTaggingFeature } from './features';

describe('SavedObjectTaggingPlugin', () => {
  let plugin: SavedObjectTaggingPlugin;
  let featuresPluginSetup: ReturnType<typeof featuresPluginMock.createSetup>;
  let usageCollectionSetup: ReturnType<typeof usageCollectionPluginMock.createSetupContract>;

  beforeEach(() => {
    plugin = new SavedObjectTaggingPlugin();
    featuresPluginSetup = featuresPluginMock.createSetup();
    usageCollectionSetup = usageCollectionPluginMock.createSetupContract();
    // `usageCollection` 'mocked' implementation use the real `CollectorSet` implementation
    // that throws when registering things that are not collectors.
    // We just want to assert that it was called here, so jest.fn is fine.
    usageCollectionSetup.registerCollector = jest.fn();
  });

  afterEach(() => {
    registerRoutesMock.mockReset();
    createTagUsageCollectorMock.mockReset();
  });

  describe('#setup', () => {
    it('registers routes', async () => {
      await plugin.setup(coreMock.createSetup(), { features: featuresPluginSetup });
      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
    });

    it('registers the globalSearch route handler context', async () => {
      const coreSetup = coreMock.createSetup();
      await plugin.setup(coreSetup, { features: featuresPluginSetup });
      expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
      expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledWith(
        'tags',
        expect.any(Function)
      );
    });

    it('registers the `savedObjectsTagging` feature', async () => {
      await plugin.setup(coreMock.createSetup(), { features: featuresPluginSetup });
      expect(featuresPluginSetup.registerKibanaFeature).toHaveBeenCalledTimes(1);
      expect(featuresPluginSetup.registerKibanaFeature).toHaveBeenCalledWith(
        savedObjectsTaggingFeature
      );
    });

    it('registers the usage collector if `usageCollection` is present', async () => {
      const tagUsageCollector = Symbol('saved_objects_tagging');
      createTagUsageCollectorMock.mockReturnValue(tagUsageCollector);

      await plugin.setup(coreMock.createSetup(), {
        features: featuresPluginSetup,
        usageCollection: usageCollectionSetup,
      });

      expect(usageCollectionSetup.registerCollector).toHaveBeenCalledTimes(1);
      expect(usageCollectionSetup.registerCollector).toHaveBeenCalledWith(tagUsageCollector);
    });
  });
});
