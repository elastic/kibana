/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '../../../../src/core/public/mocks';
import { BannersPlugin } from './plugin';

describe('BannersPlugin', () => {
  let plugin: BannersPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    plugin = new BannersPlugin();
    plugin.setup(coreSetup);
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
});
