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
