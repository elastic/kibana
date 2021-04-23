/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpFetchOptions } from 'kibana/public';
import { getHttp } from '../kibana_services';

export interface HttpOptions {
  url: string;
  method: string;
  headers?: {
    [key: string]: any;
  };
  data?: unknown;
  query?: any;
}

export async function http(options: HttpOptions) {
  if (!(options && options.url)) {
    throw i18n.translate('xpack.fileUpload.httpService.noUrl', {
      defaultMessage: 'No URL provided',
    });
  }
  const url: string = options.url || '';
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const allHeaders = options.headers === undefined ? headers : { ...options.headers, ...headers };
  const body = options.data === undefined ? null : JSON.stringify(options.data);

  const payload: HttpFetchOptions = {
    method: options.method || 'GET',
    headers: allHeaders,
    credentials: 'same-origin',
    query: options.query,
  };

  if (body !== null) {
    payload.body = body;
  }
  return await doFetch(url, payload);
}

async function doFetch(url: string, payload: HttpFetchOptions) {
  try {
    return await getHttp().fetch(url, payload);
  } catch (err) {
    return {
      failures: [
        i18n.translate('xpack.fileUpload.httpService.fetchError', {
          defaultMessage: 'Error performing fetch: {error}',
          values: { error: err.message },
        }),
      ],
    };
  }
}
