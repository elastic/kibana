/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import {
  UseRequestConfig,
  useRequest as _useRequest,
} from '../../../../../../src/plugins/es_ui_shared/public';

interface GenericObject {
  [key: string]: any;
}

let _httpClient: HttpSetup;

export function init(httpClient: HttpSetup): void {
  _httpClient = httpClient;
}

function getFullPath(path: string): string {
  const apiPrefix = '/api/index_lifecycle_management';

  if (path) {
    return `${apiPrefix}/${path}`;
  }

  return apiPrefix;
}

export function sendPost(path: string, payload: GenericObject, query?: GenericObject) {
  return _httpClient.post(getFullPath(path), { body: JSON.stringify(payload), query });
}

export function sendGet(path: string, query?: GenericObject): any {
  return _httpClient.get(getFullPath(path), { query });
}

export function sendDelete(path: string) {
  return _httpClient.delete(getFullPath(path));
}

export const useRequest = <T = any, E = { statusCode: number; error: string; message: string }>(
  config: UseRequestConfig
) => {
  return _useRequest<T, E>(_httpClient, { ...config, path: getFullPath(config.path) });
};
