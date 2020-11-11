/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerRoutesMock } from './plugin.test.mocks';

import { coreMock } from '../../../../src/core/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { SavedObjectTaggingPlugin } from './plugin';
import { savedObjectsTaggingFeature } from './features';

describe('SavedObjectTaggingPlugin', () => {
  let plugin: SavedObjectTaggingPlugin;
  let featuresPluginSetup: ReturnType<typeof featuresPluginMock.createSetup>;

  beforeEach(() => {
    plugin = new SavedObjectTaggingPlugin(coreMock.createPluginInitializerContext());
    featuresPluginSetup = featuresPluginMock.createSetup();
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
  });
});
