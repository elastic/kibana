/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { Banner } from './components';
import { BannerClientConfig } from './types';
import { getBannerInfo } from './get_banner_info';

export class BannersPlugin implements Plugin<{}, {}, {}, {}> {
  private readonly config: BannerClientConfig;

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<BannerClientConfig>();
  }

  setup({}: CoreSetup<{}, {}>) {
    return {};
  }

  start({ chrome, uiSettings, http }: CoreStart) {
    if (this.config.placement !== 'disabled') {
      getBannerInfo(http).then(
        ({ allowed, banner }) => {
          if (allowed) {
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
