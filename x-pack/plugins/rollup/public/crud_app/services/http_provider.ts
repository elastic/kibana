/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';

let _http: HttpStart | null = null;

export function setHttp(http: HttpStart) {
  _http = http;
}

export function getHttp() {
  if (!_http) {
    throw new Error('Rollup http is not defined');
  }
  return _http;
}
