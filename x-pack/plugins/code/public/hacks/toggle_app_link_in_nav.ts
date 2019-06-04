/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { onStart } from 'ui/new_platform';

onStart(({ core }) => {
  const codeUiEnabled = core.injectedMetadata.getInjectedVar('codeUiEnabled');
  if (codeUiEnabled === false) {
    core.chrome.navLinks.update('code', { hidden: true });
  }
});
