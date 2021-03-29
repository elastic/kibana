/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBannerInfoMock } from './plugin.test.mocks';
import { coreMock } from '../../../../src/core/public/mocks';
import { BannerConfiguration } from '../common/types';
import { BannersPlugin } from './plugin';

const nextTick = async () => await new Promise<void>((resolve) => resolve());

const createBannerConfig = (parts: Partial<BannerConfiguration> = {}): BannerConfiguration => ({
  placement: 'disabled',
  textContent: 'foo',
  textColor: '#FFFFFF',
  backgroundColor: '#000000',
  ...parts,
});

describe('BannersPlugin', () => {
  let plugin: BannersPlugin;
  let pluginInitContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    pluginInitContext = coreMock.createPluginInitializerContext();
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    getBannerInfoMock.mockResolvedValue({
      allowed: false,
      banner: createBannerConfig(),
    });
  });

  const startPlugin = async () => {
    pluginInitContext = coreMock.createPluginInitializerContext();
    plugin = new BannersPlugin(pluginInitContext);
    plugin.setup(coreSetup);
    plugin.start(coreStart);
    // await for the `getBannerInfo` promise to resolve
    await nextTick();
  };

  afterEach(() => {
    getBannerInfoMock.mockReset();
  });

  describe('when banner is allowed', () => {
    it('registers the header banner if `banner.placement` is `top`', async () => {
      getBannerInfoMock.mockResolvedValue({
        allowed: true,
        banner: createBannerConfig({
          placement: 'top',
        }),
      });

      await startPlugin();

      expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(1);
      expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledWith({
        content: expect.any(Function),
      });
    });

    it('does not register the header banner if `banner.placement` is `disabled`', async () => {
      getBannerInfoMock.mockResolvedValue({
        allowed: true,
        banner: createBannerConfig({
          placement: 'disabled',
        }),
      });

      await startPlugin();

      expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(0);
    });
  });

  describe('when banner is not allowed', () => {
    it('does not register the header banner if `banner.placement` is `top`', async () => {
      getBannerInfoMock.mockResolvedValue({
        allowed: false,
        banner: createBannerConfig({
          placement: 'top',
        }),
      });

      await startPlugin();

      expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(0);
    });

    it('does not register the header banner if `banner.placement` is `disabled`', async () => {
      getBannerInfoMock.mockResolvedValue({
        allowed: false,
        banner: createBannerConfig({
          placement: 'disabled',
        }),
      });

      await startPlugin();

      expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(0);
    });
  });
});
