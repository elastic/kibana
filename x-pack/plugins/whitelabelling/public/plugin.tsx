/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { getThemingInfo } from './get_theming_info';

export class WhitelabellingPlugin implements Plugin {
  constructor(context: PluginInitializerContext) {}

  setup(core: CoreSetup) {
    return {};
  }

  start(core: CoreStart) {
    const { http, chrome } = core;
    chrome.registerWhitelabellingPlugin('whitelabelling');
    getThemingInfo(http).then(({ theming }) => {
      if (theming.logo) {
        chrome.setCustomLogo(theming.logo);
      }
      if (theming.mark) {
        chrome.setCustomMark(theming.mark);
      }
    });

    return {};
  }
}
