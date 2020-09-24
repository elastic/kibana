/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpClient } from 'src/core/public';
import { API_BASE_PATH } from '../../../common/constants';

export function putLicense(http: HttpClient, license: string, acknowledge: boolean) {
  return http.put(API_BASE_PATH, {
    query: {
      acknowledge: acknowledge ? 'true' : '',
    },
    body: license,
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function startBasic(http: HttpClient, acknowledge: boolean) {
  return http.post(`${API_BASE_PATH}/start_basic`, {
    query: {
      acknowledge: acknowledge ? 'true' : '',
    },
    headers: {
      contentType: 'application/json',
    },
    body: null,
    cache: 'no-cache',
  });
}

export function startTrial(http: HttpClient) {
  return http.post(`${API_BASE_PATH}/start_trial`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function canStartTrial(http: HttpClient) {
  return http.get(`${API_BASE_PATH}/start_trial`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}

export function getPermissions(http: HttpClient) {
  return http.post(`${API_BASE_PATH}/permissions`, {
    headers: {
      contentType: 'application/json',
    },
    cache: 'no-cache',
  });
}
