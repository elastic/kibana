/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UseRequestConfig,
  useRequest as _useRequest,
  Error,
} from '../../../../../../src/plugins/es_ui_shared/public';

let _httpClient: any;

export function init(httpClient: any): void {
  _httpClient = httpClient;
}

function getFullPath(path: string): string {
  const apiPrefix = '/api/index_lifecycle_management';

  if (path) {
    return `${apiPrefix}/${path}`;
  }

  return apiPrefix;
}

export function sendPost(path: string, payload: any): any {
  return _httpClient.post(getFullPath(path), { body: JSON.stringify(payload) });
}

export function sendGet(path: string, query?: any): any {
  return _httpClient.get(getFullPath(path), { query });
}

export function sendDelete(path: string): any {
  return _httpClient.delete(getFullPath(path));
}

export const useRequest = (config: UseRequestConfig) => {
  return _useRequest<any, Error>(_httpClient, { ...config, path: getFullPath(config.path) });
};
