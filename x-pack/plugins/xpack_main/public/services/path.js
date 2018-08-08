/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

export function PathProvider($window) {
  const path = chrome.removeBasePath($window.location.pathname);
  return {
    isLoginOrLogout() {
      return path === '/login' || path === '/logout';
    }
  };
}
