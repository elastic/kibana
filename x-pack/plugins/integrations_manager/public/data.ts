/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import chrome from 'ui/chrome';
import { IntegrationInfo, IntegrationList } from '../common/types';
import { API_INTEGRATIONS_INFO, API_INTEGRATIONS_LIST } from '../common/constants';

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

export async function getIntegrationsList(): Promise<IntegrationList> {
  const response = await fetch(API_INTEGRATIONS_LIST);
  const list: IntegrationList = response.data;
  return list;
}

export async function getIntegrationInfoByKey(pkgkey: string): Promise<IntegrationInfo> {
  const response = await fetch(API_INTEGRATIONS_INFO.replace('{pkgkey}', pkgkey));
  const info: IntegrationInfo = response.data;
  return info;
}
