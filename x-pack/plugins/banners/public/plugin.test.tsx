/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBannerInfoMock } from './plugin.test.mocks';
import { coreMock } from '../../../../src/core/public/mocks';
import { BannersPlugin } from './plugin';
import { BannerClientConfig } from './types';

const nextTick = async () => await new Promise<void>((resolve) => resolve());

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
    });
  });

  const startPlugin = async (config: BannerClientConfig) => {
    pluginInitContext = coreMock.createPluginInitializerContext(config);
    plugin = new BannersPlugin(pluginInitContext);
    plugin.setup(coreSetup);
    plugin.start(coreStart);
    // await for the `getBannerInfo` promise to resolve
    await nextTick();
  };

  afterEach(() => {
    getBannerInfoMock.mockReset();
  });

  it('calls `getBannerInfo` if `config.placement !== disabled`', async () => {
    await startPlugin({
      placement: 'header',
    });

    expect(getBannerInfoMock).toHaveBeenCalledTimes(1);
  });

  it('does not call `getBannerInfo` if `config.placement === disabled`', async () => {
    await startPlugin({
      placement: 'disabled',
    });

    expect(getBannerInfoMock).not.toHaveBeenCalled();
  });

  it('registers the header banner if `getBannerInfo` return `allowed=true`', async () => {
    getBannerInfoMock.mockResolvedValue({
      allowed: true,
    });

    await startPlugin({
      placement: 'header',
    });

    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(1);
    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledWith({
      content: expect.any(Function),
    });
  });

  it('does not register the header banner if `getBannerInfo` return `allowed=false`', async () => {
    getBannerInfoMock.mockResolvedValue({
      allowed: false,
    });

    await startPlugin({
      placement: 'header',
    });

    expect(coreStart.chrome.setHeaderBanner).not.toHaveBeenCalled();
  });
});
