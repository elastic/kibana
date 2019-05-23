/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ID = 'integrations_manager';

export const API_ROOT = `/api/${ID}`;

export const API = {
  ROOT: API_ROOT,
  FETCH_LIST: `${API_ROOT}/list`,
  FETCH_INFO: `${API_ROOT}/package/{pkgkey}`,
  FETCH_FILE: `${API_ROOT}/package/{pkgkey}/get`,
};

export const APP = {
  ROOT: `/app/${ID}`,
  // TODO: why must these be relative (something something React Router)
  // does it matter that they're different from `API` path style?
  LIST_VIEW: '/',
  DETAIL_VIEW: '/detail/:pkgkey',
};
