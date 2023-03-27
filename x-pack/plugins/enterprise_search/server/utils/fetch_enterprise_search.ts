/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch, { RequestInit } from 'node-fetch';

import { KibanaRequest } from '@kbn/core/server';

import { ConfigType } from '..';

import { entSearchHttpAgent } from '../lib/enterprise_search_http_agent';

export interface ResponseError {
  responseStatus: number;
  responseStatusText: string;
}

export function isResponseError(resp: unknown): resp is ResponseError {
  if (typeof resp !== 'object') return false;
  if (resp === null) return false;
  if ('responseStatus' in resp && 'responseStatusText' in resp) return true;
  return false;
}

export async function fetchEnterpriseSearch<T>(
  config: ConfigType,
  request: KibanaRequest,
  endpoint: string
): Promise<T | ResponseError | undefined> {
  if (!config.host) return undefined;

  const enterpriseSearchUrl = encodeURI(`${config.host}${endpoint}`);
  const options: RequestInit = {
    agent: entSearchHttpAgent.getHttpAgent(),
    headers: {
      Authorization: request.headers.authorization as string,
      ...config.customHeaders,
    },
  };

  const response = await fetch(enterpriseSearchUrl, options);

  if (!response.ok) {
    return {
      responseStatus: response.status,
      responseStatusText: response.statusText,
    };
  }

  return await response.json();
}
