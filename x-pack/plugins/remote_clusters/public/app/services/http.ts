/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let client: any;
let addBasePath: any;

export function init(httpClient: any, chrome: any): void {
  client = httpClient;
  addBasePath = chrome.addBasePath.bind(chrome);
}

export function getFullPath(path: string): string {
  const apiPrefix = addBasePath('/api/remote_clusters');

  if (path) {
    return `${apiPrefix}/${path}`;
  }

  return apiPrefix;
}

export function sendPost(path: string, payload: any): any {
  return client.post(getFullPath(path), payload);
}

export function sendGet(path: string): any {
  return client.get(getFullPath(path));
}

export function sendPut(path: string, payload: any): any {
  return client.put(getFullPath(path), payload);
}

export function sendDelete(path: string): any {
  return client.delete(getFullPath(path));
}
