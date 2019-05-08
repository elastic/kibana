/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { uiModules } from 'ui/modules';
import { onStart } from 'ui/new_platform';

uiModules.get('xpack/ml').run((Private) => {
  const xpackInfo = Private(XPackInfoProvider);

  const showAppLink = xpackInfo.get('features.ml.showLinks', false);

  const navLinkUpdates = {
    // hide by default, only show once the xpackInfo is initialized
    hidden: !showAppLink,
    disabled: !showAppLink || (showAppLink && !xpackInfo.get('features.ml.isAvailable', false))
  };

  onStart(({ core }) => core.chrome.navLinks.update('ml', navLinkUpdates));
});
