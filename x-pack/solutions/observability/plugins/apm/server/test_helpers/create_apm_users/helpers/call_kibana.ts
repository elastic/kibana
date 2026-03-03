/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AxiosRequestConfig, AxiosError } from 'axios';
import axios from 'axios';
import type { Elasticsearch, Kibana } from '../create_apm_users';

const DEFAULT_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'Kibana',
};

const stripUrlCredentials = (urlString: string): string => {
  try {
    const parsed = new URL(urlString);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return urlString;
  }
};

export async function callKibana<T>({
  elasticsearch,
  kibana,
  options,
}: {
  elasticsearch: Omit<Elasticsearch, 'node'>;
  kibana: Kibana;
  options: AxiosRequestConfig;
}): Promise<T> {
  const baseUrl = await getBaseUrl(kibana.hostname);
  const { username, password } = elasticsearch;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  const { data } = await axios.request({
    ...options,
    baseURL: stripUrlCredentials(baseUrl),
    allowAbsoluteUrls: false,
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers,
      Authorization: `Basic ${basicAuth}`,
    },
  });
  return data;
}

const getBaseUrl = async (kibanaHostname: string) => {
  try {
    await axios.request({
      url: kibanaHostname,
      maxRedirects: 0,
      headers: DEFAULT_HEADERS,
    });
  } catch (e) {
    if (isAxiosError(e)) {
      const location = e.response?.headers?.location ?? '';
      const hasBasePath = RegExp(/^\/\w{3}$/).test(location);
      const basePath = hasBasePath ? location : '';
      return `${kibanaHostname}${basePath}`;
    }

    throw e;
  }
  return kibanaHostname;
};

export function isAxiosError(e: AxiosError | Error): e is AxiosError {
  return 'isAxiosError' in e;
}

export class AbortError extends Error {
  constructor(message: string) {
    super(message);
  }
}
