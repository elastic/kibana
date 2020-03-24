/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup, HttpResponse } from 'kibana/public';
import { API_BASE_PATH } from '../../../common/constants';

let _httpClient: HttpSetup;

export function init(httpClient: HttpSetup): void {
  _httpClient = httpClient;
}

export function getFullPath(path: string): string {
  if (path) {
    return `${API_BASE_PATH}/${path}`;
  }

  return API_BASE_PATH;
}

export function sendPost(
  path: string,
  payload: {
    name: string;
    seeds: string[];
    skipUnavailable: boolean;
  }
): Promise<HttpResponse> {
  return _httpClient.post(getFullPath(path), {
    body: JSON.stringify(payload),
  });
}

export function sendGet(path: string): Promise<HttpResponse> {
  return _httpClient.get(getFullPath(path));
}

export function sendPut(
  path: string,
  payload: {
    seeds: string[];
    skipUnavailable: boolean;
  }
): Promise<HttpResponse> {
  return _httpClient.put(getFullPath(path), {
    body: JSON.stringify(payload),
  });
}

export function sendDelete(path: string): Promise<HttpResponse> {
  return _httpClient.delete(getFullPath(path));
}
