/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { getHttp } from './http_provider';

export function trackUserAction(actionType) {
  getHttp().post(chrome.addBasePath(`/api/user_action/rollup-job-wizard/${actionType}`));
}

export function trackUserRequest(action, actionType) {
  // Only track successful actions.
  action.then(() => trackUserAction(actionType));
  return action;
}
