/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { API } from '../common/constants';

export const fetch = axios.create({
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'professionally-crafted-string-of-text',
  },
  timeout: 30 * 1000,
});

export async function getIntegrationsList() {
  return fetch(API.FETCH_LIST);
}

export async function getIntegrationInfoByKey(pkgkey: string) {
  return fetch(API.FETCH_INFO.replace('{pkgkey}', pkgkey));
}
