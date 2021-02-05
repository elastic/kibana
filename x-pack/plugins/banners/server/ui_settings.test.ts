/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '../../../../src/core/server/mocks';
import { registerSettings } from './ui_settings';

describe('registerSettings', () => {
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createSetupContract>;

  beforeEach(() => {
    uiSettings = uiSettingsServiceMock.createSetupContract();
  });

  it('registers the settings', () => {
    registerSettings(uiSettings);

    expect(uiSettings.register).toHaveBeenCalledTimes(1);
    expect(uiSettings.register).toHaveBeenCalledWith({
      'banner:placement': expect.any(Object),
      'banner:textContent': expect.any(Object),
      'banner:textColor': expect.any(Object),
      'banner:backgroundColor': expect.any(Object),
    });
  });
});
