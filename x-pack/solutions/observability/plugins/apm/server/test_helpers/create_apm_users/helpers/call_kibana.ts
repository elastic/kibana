/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Elasticsearch, Kibana } from '../create_apm_users';
export { AbortError } from './abort_error';

const DEFAULT_HEADERS: Record<string, string> = {
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

export interface CallKibanaOptions {
  method?: string;
  url?: string;
  data?: unknown;
  headers?: Record<string, string>;
  validateStatus?: (status: number) => boolean;
}

export async function callKibana<T>({
  elasticsearch,
  kibana,
  options,
}: {
  elasticsearch: Omit<Elasticsearch, 'node'>;
  kibana: Kibana;
  options: CallKibanaOptions;
}): Promise<T> {
  const baseUrl = await getBaseUrl(kibana.hostname);
  const { username, password } = elasticsearch;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  const fullUrl = `${stripUrlCredentials(baseUrl)}${options.url ?? ''}`;

  const response = await fetch(fullUrl, {
    method: options.method ?? 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'content-type': 'application/json',
      ...options.headers,
      Authorization: `Basic ${basicAuth}`,
    },
    ...(options.data !== undefined
      ? { body: typeof options.data === 'string' ? options.data : JSON.stringify(options.data) }
      : {}),
    redirect: 'manual',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new KibanaError(
      response.status,
      `Request failed with status ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();
  return data as T;
}

const getBaseUrl = async (kibanaHostname: string) => {
  try {
    const response = await fetch(kibanaHostname, {
      redirect: 'manual',
      headers: DEFAULT_HEADERS,
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      const hasBasePath = RegExp(/^\/\w{3}$/).test(location);
      const basePath = hasBasePath ? location : '';
      return `${kibanaHostname}${basePath}`;
    }
  } catch (e) {
    // If fetch itself throws (network error), just return the hostname
  }
  return kibanaHostname;
};

export class KibanaError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isKibanaError(e: unknown): e is KibanaError {
  return e instanceof KibanaError;
}
