/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin, IUiSettingsClient } from 'src/core/public';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { Banner } from './components';
import { BannerPlacement, BannerConfiguration } from './types';

export class BannersPlugin implements Plugin<{}, {}, {}, {}> {
  setup({}: CoreSetup<{}, {}>) {
    return {};
  }

  start({ chrome, uiSettings }: CoreStart) {
    const config = getBannerConfig(uiSettings);
    if (config.placement === 'header') {
      chrome.setHeaderBanner({
        content: toMountPoint(<Banner bannerConfig={config} />),
      });
    }
    return {};
  }
}

const getBannerConfig = (uiSettings: IUiSettingsClient): BannerConfiguration => {
  return {
    placement: uiSettings.get<BannerPlacement>('banner:placement', 'disabled'),
    text: uiSettings.get<string>('banner:textContent', 'foo'),
    textColor: uiSettings.get<string>('banner:textColor', '#000000'),
    backgroundColor: uiSettings.get<string>('banner:backgroundColor', '#FFFFFF'),
  };
};
