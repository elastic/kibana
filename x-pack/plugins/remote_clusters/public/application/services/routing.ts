/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScopedHistory } from '@kbn/core/public';

/**
 * This file based on guidance from https://github.com/elastic/eui/blob/master/wiki/react-router.md
 */

let _userHasLeftApp = false;

export function setUserHasLeftApp(userHasLeftApp: boolean) {
  _userHasLeftApp = userHasLeftApp;
}

export function getUserHasLeftApp() {
  return _userHasLeftApp;
}

export interface AppRouter {
  history: ScopedHistory;
  route: { location: ScopedHistory['location'] };
}
let router: AppRouter;
export function registerRouter(reactRouter: AppRouter) {
  router = reactRouter;
}

export function getRouter() {
  return router;
}
