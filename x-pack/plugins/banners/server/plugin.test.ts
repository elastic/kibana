/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerRoutesMock, registerSettingsMock } from './plugin.test.mocks';

import { coreMock } from '@kbn/core/server/mocks';
import { BannersPlugin } from './plugin';
import { BannersConfigType } from './config';

describe('BannersPlugin', () => {
  let plugin: BannersPlugin;
  let pluginInitContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let bannerConfig: BannersConfigType;

  beforeEach(() => {
    bannerConfig = {
      placement: 'top',
      textContent: 'foo',
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      disableSpaceBanners: false,
    };
    pluginInitContext = coreMock.createPluginInitializerContext();
    pluginInitContext.config.get.mockReturnValue(bannerConfig);
    coreSetup = coreMock.createSetup();

    plugin = new BannersPlugin(pluginInitContext);
  });

  afterEach(() => {
    registerRoutesMock.mockReset();
    registerSettingsMock.mockReset();
  });

  describe('#setup', () => {
    it('calls `registerRoutes` with the correct parameters', () => {
      plugin.setup(coreSetup);

      expect(registerRoutesMock).toHaveBeenCalledTimes(1);
      expect(registerRoutesMock).toHaveBeenCalledWith(expect.any(Object), bannerConfig);
    });
    it('calls `registerSettings` with the correct parameters', () => {
      plugin.setup(coreSetup);

      expect(registerSettingsMock).toHaveBeenCalledTimes(1);
      expect(registerSettingsMock).toHaveBeenCalledWith(coreSetup.uiSettings, bannerConfig);
    });
  });
});
