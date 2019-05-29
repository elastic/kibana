/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import chrome from 'ui/chrome';
import { API } from '../common/constants';

export const fetch = axios.create({
  withCredentials: true,
  baseURL: chrome.getBasePath(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': chrome.getXsrfToken(),
  },
  timeout: 30 * 1000,
});

export async function getIntegrationsList() {
  return fetch(API.FETCH_LIST);
}

export async function getIntegrationInfoByKey(pkgkey: string) {
  return fetch(API.FETCH_INFO.replace('{pkgkey}', pkgkey));
}
