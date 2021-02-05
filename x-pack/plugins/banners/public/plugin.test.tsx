/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBannerInfoMock } from './plugin.test.mocks';
import { coreMock } from '../../../../src/core/public/mocks';
import { BannersPlugin } from './plugin';

describe('BannersPlugin', () => {
  let plugin: BannersPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    getBannerInfoMock.mockResolvedValue({
      allowed: false,
    });

    plugin = new BannersPlugin();
    plugin.setup(coreSetup);
  });

  afterEach(() => {
    getBannerInfoMock.mockReset();
  });

  it('registers the header banner when `banner:placement` is `header`', () => {
    coreStart.uiSettings.get.mockImplementation((key, defaultValue) => {
      if (key === 'banner:placement') {
        return 'header';
      }
      return defaultValue;
    });

    plugin.start(coreStart);

    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(1);
    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledWith({
      content: expect.any(Function),
    });
  });

  it('does not register the header banner when `banner:placement` is `disabled`', () => {
    coreStart.uiSettings.get.mockImplementation((key, defaultValue) => {
      if (key === 'banner:placement') {
        return 'disabled';
      }
      return defaultValue;
    });

    plugin.start(coreStart);

    expect(coreStart.chrome.setHeaderBanner).not.toHaveBeenCalled();
  });

  it('disable the banner if `getBannerInfo` returns `allowed: false`', async () => {
    coreStart.uiSettings.get.mockImplementation((key, defaultValue) => {
      if (key === 'banner:placement') {
        return 'header';
      }
      return defaultValue;
    });

    let resolveInfo: Function;
    const resolveBannerPromise = new Promise((resolve) => {
      resolveInfo = resolve;
    });

    getBannerInfoMock.mockReturnValue(resolveBannerPromise);

    plugin.start(coreStart);

    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(1);
    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledWith({
      content: expect.any(Function),
    });

    resolveInfo!({
      allowed: false,
    });

    await new Promise<void>((resolve) => resolve());

    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledTimes(2);
    expect(coreStart.chrome.setHeaderBanner).toHaveBeenCalledWith(undefined);
  });
});
