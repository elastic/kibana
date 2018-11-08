/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { API_BASE_PATH } from '../../../common/constants';

const apiPrefix = chrome.addBasePath(API_BASE_PATH);

// This is an Angular service, which is why we use this provider pattern
// to access it within our React app.
let httpClient;

export function setHttpClient(client) {
  httpClient = client;
}

// ---

export const loadAutoFollowPatterns = async () => {
  return await httpClient.get(`${apiPrefix}/auto_follow_patterns`).then(response => response.data);
};
