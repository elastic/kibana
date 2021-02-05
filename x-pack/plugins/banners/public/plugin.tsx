/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { Banner } from './components';
import { getBannerConfig } from './config';
import { getBannerInfo } from './get_banner_info';

export class BannersPlugin implements Plugin<{}, {}, {}, {}> {
  setup({ http }: CoreSetup<{}, {}>) {
    return {};
  }

  start({ chrome, uiSettings, http }: CoreStart) {
    const config = getBannerConfig(uiSettings);

    if (config.placement === 'header') {
      // We set the banner without waiting for the server's response to avoid UI flickering
      // Having a 'on'->'off' blink when the license is not valid is better
      // than the other way around, given that this block is only executed when the
      // feature has been explicitly enabled anyway.
      chrome.setHeaderBanner({
        content: toMountPoint(<Banner bannerConfig={config} />),
      });
      getBannerInfo(http).then(
        ({ allowed }) => {
          if (!allowed) {
            chrome.setHeaderBanner(undefined);
          }
        },
        () => {
          // always awkward to handle async errors when we don't even have a client-side logger.
        }
      );
    }

    return {};
  }
}
