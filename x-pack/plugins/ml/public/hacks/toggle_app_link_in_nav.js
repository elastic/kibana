/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';

uiModules.get('xpack/ml').run((Private) => {
  const xpackInfo = Private(XPackInfoProvider);
  if (!chrome.navLinkExists('ml')) return;

  const navLink = chrome.getNavLinkById('ml');
  // hide by default, only show once the xpackInfo is initialized
  navLink.hidden = true;
  const showAppLink = xpackInfo.get('features.ml.showLinks', false);
  navLink.hidden = !showAppLink;
  if (showAppLink) {
    navLink.disabled = !xpackInfo.get('features.ml.isAvailable', false);
  }
});
