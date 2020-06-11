/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This file based on guidance from https://github.com/elastic/eui/blob/master/wiki/react-router.md
 */

let _userHasLeftApp = false;

export function setUserHasLeftApp(userHasLeftApp) {
  _userHasLeftApp = userHasLeftApp;
}

export function getUserHasLeftApp() {
  return _userHasLeftApp;
}

let router;
export function registerRouter(reactRouter) {
  router = reactRouter;
}

export function getRouter() {
  return router;
}
