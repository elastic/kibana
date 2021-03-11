/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '../../../../src/core/server/mocks';
import type { BannerConfiguration } from '../common';
import { registerSettings } from './ui_settings';

const createConfig = (parts: Partial<BannerConfiguration> = {}): BannerConfiguration => ({
  placement: 'disabled',
  backgroundColor: '#0000',
  textColor: '#FFFFFF',
  textContent: 'Hello from the banner',
  ...parts,
});

describe('registerSettings', () => {
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createSetupContract>;

  beforeEach(() => {
    uiSettings = uiSettingsServiceMock.createSetupContract();
  });

  it('registers the settings', () => {
    registerSettings(uiSettings, createConfig());

    expect(uiSettings.register).toHaveBeenCalledTimes(1);
    expect(uiSettings.register).toHaveBeenCalledWith({
      'banner:placement': expect.any(Object),
      'banner:textContent': expect.any(Object),
      'banner:textColor': expect.any(Object),
      'banner:backgroundColor': expect.any(Object),
    });
  });

  it('uses the configuration values as defaults', () => {
    const config = createConfig({
      placement: 'header',
      backgroundColor: '#FF00CC',
      textColor: '#AAFFEE',
      textContent: 'Some text',
    });

    registerSettings(uiSettings, config);

    expect(uiSettings.register).toHaveBeenCalledTimes(1);
    expect(uiSettings.register).toHaveBeenCalledWith({
      'banner:placement': expect.objectContaining({
        value: config.placement,
      }),
      'banner:textContent': expect.objectContaining({
        value: config.textContent,
      }),
      'banner:textColor': expect.objectContaining({
        value: config.textColor,
      }),
      'banner:backgroundColor': expect.objectContaining({
        value: config.backgroundColor,
      }),
    });
  });
});
