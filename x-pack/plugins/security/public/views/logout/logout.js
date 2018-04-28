/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import 'plugins/security/views/logout/logout.less';

chrome
  .setVisible(false)
  .setRootController('logout', ($window) => {
    $window.sessionStorage.clear();

    // Redirect user to the server logout endpoint to complete logout.
    $window.location.href = chrome.addBasePath(`/api/security/v1/logout${$window.location.search}`);
  });
