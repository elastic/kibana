/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';

import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

uiModules.get('xpack/graph').run((Private) => {
  const xpackInfo = Private(XPackInfoProvider);
  if (!chrome.navLinkExists('graph')) {
    return;
  }

  const navLink = chrome.getNavLinkById('graph');
  navLink.hidden = true;
  const showAppLink = xpackInfo.get('features.graph.showAppLink', false);
  navLink.hidden = !showAppLink;
  if (showAppLink) {
    navLink.disabled = !xpackInfo.get('features.graph.enableAppLink', false);
    navLink.tooltip = xpackInfo.get('features.graph.message');
  }
});
