/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpClient } from 'kibana/public';

let _http: HttpClient | null = null;

export function setHttp(http: HttpClient) {
  _http = http;
}

export function getHttp() {
  if (!_http) {
    throw new Error('Rollup http is not defined');
  }
  return _http;
}
