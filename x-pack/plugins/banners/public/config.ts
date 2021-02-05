/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from 'src/core/public';
import { BannerConfiguration, BannerPlacement } from './types';

export const getBannerConfig = (uiSettings: IUiSettingsClient): BannerConfiguration => {
  return {
    placement: uiSettings.get<BannerPlacement>('banner:placement', 'disabled'),
    text: uiSettings.get<string>('banner:textContent', ''),
    textColor: uiSettings.get<string>('banner:textColor', '#000000'),
    backgroundColor: uiSettings.get<string>('banner:backgroundColor', '#FFFFFF'),
  };
};
