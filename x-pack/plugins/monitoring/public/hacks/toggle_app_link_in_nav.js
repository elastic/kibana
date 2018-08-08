/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';

uiModules.get('monitoring/hacks').run((monitoringUiEnabled) => {
  if (monitoringUiEnabled || !chrome.navLinkExists('monitoring')) {
    return;
  }

  chrome.getNavLinkById('monitoring').hidden = true;
});
