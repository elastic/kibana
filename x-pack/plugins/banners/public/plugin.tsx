/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { Banner } from './components';
import { getBannerInfo } from './get_banner_info';
import { BannerPluginStartDependencies } from './types';

export class BannersPlugin implements Plugin<{}, {}, {}, BannerPluginStartDependencies> {
  constructor(context: PluginInitializerContext) {}

  setup({}: CoreSetup<{}, {}>) {
    return {};
  }

  start(
    { chrome, uiSettings, http }: CoreStart,
    { screenshotMode }: BannerPluginStartDependencies
  ) {
    if (!screenshotMode.isScreenshotMode()) {
      getBannerInfo(http).then(
        ({ allowed, banner }) => {
          if (allowed && banner.placement === 'top') {
            chrome.setHeaderBanner({
              content: toMountPoint(<Banner bannerConfig={banner} />),
            });
          }
        },
        () => {
          chrome.setHeaderBanner(undefined);
        }
      );
    }

    return {};
  }
}
