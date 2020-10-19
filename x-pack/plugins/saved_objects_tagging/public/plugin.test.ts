/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from '../../../../src/core/public/mocks';
import { managementPluginMock } from '../../../../src/plugins/management/public/mocks';
import { savedObjectTaggingOssPluginMock } from '../../../../src/plugins/saved_objects_tagging_oss/public/mocks';
import { SavedObjectTaggingPlugin } from './plugin';

describe('SavedObjectTaggingPlugin', () => {
  let plugin: SavedObjectTaggingPlugin;
  let managementPluginSetup: ReturnType<typeof managementPluginMock.createSetupContract>;
  let savedObjectsTaggingOssPluginSetup: ReturnType<typeof savedObjectTaggingOssPluginMock.createSetup>;

  beforeEach(() => {
    plugin = new SavedObjectTaggingPlugin(coreMock.createPluginInitializerContext());
  });

  describe('#setup', () => {
    beforeEach(() => {
      managementPluginSetup = managementPluginMock.createSetupContract();
      savedObjectsTaggingOssPluginSetup = savedObjectTaggingOssPluginMock.createSetup();

      plugin.setup(coreMock.createSetup(), {
        management: managementPluginSetup,
        savedObjectsTaggingOss: savedObjectsTaggingOssPluginSetup,
      });
    });

    it('register the `tags` app to the `kibana` management section', () => {
      expect(managementPluginSetup.sections.section.kibana.registerApp).toHaveBeenCalledTimes(1);
      expect(managementPluginSetup.sections.section.kibana.registerApp).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tags',
          title: 'Tags',
          mount: expect.any(Function),
        })
      );
    });
    it('register its API app to the `savedObjectsTaggingOss` plugin', () => {
      expect(savedObjectsTaggingOssPluginSetup.registerTaggingApi).toHaveBeenCalledTimes(1);
      expect(savedObjectsTaggingOssPluginSetup.registerTaggingApi).toHaveBeenCalledWith(
        expect.any(Promise)
      );
    });
  });
});
