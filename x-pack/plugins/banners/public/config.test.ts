/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '../../../../src/core/public/mocks';
import { getBannerConfig } from './config';

describe('getBannerConfig', () => {
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createStartContract>;

  beforeEach(() => {
    uiSettings = uiSettingsServiceMock.createStartContract();
  });

  it('calls `uiSettingsClient.get` with the correct parameters', () => {
    getBannerConfig(uiSettings);

    expect(uiSettings.get).toHaveBeenCalledTimes(4);
    expect(uiSettings.get).toHaveBeenCalledWith('banner:placement', expect.any(String));
    expect(uiSettings.get).toHaveBeenCalledWith('banner:textContent', expect.any(String));
    expect(uiSettings.get).toHaveBeenCalledWith('banner:textColor', expect.any(String));
    expect(uiSettings.get).toHaveBeenCalledWith('banner:backgroundColor', expect.any(String));
  });

  it('returns the values coming from the uiSettings client', () => {
    uiSettings.get.mockImplementation((key, defaultValue) => {
      return key;
    });

    const config = getBannerConfig(uiSettings);

    expect(config.placement).toEqual('banner:placement');
    expect(config.text).toEqual('banner:textContent');
    expect(config.textColor).toEqual('banner:textColor');
    expect(config.backgroundColor).toEqual('banner:backgroundColor');
  });
});
