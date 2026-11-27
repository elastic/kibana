/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' } as const;

/** A failed request, carrying the status the service-account setup reads for `404` and `409`. */
export class AdminSessionRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'AdminSessionRequestError';
  }
}

export interface AdminSessionRequestOptions {
  method: 'GET' | 'POST' | 'PUT';
  query?: Record<string, string | number>;
  body?: string;
  version?: string;
}

/**
 * Requests Kibana as the deployment's admin through a SAML session cookie. On Serverless, UIAM
 * rejects the native superuser that `kbnClient` (and the eval `fetch`) authenticates as with
 * "Provided credential is not compatible with UIAM", so creating service accounts needs this.
 */
export const createAdminSessionRequest =
  (
    kibanaUrl: string,
    cookieHeader: Record<string, string>,
    request: typeof globalThis.fetch = globalThis.fetch
  ) =>
  async <T>(
    path: string,
    { method, query, body, version }: AdminSessionRequestOptions
  ): Promise<T> => {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, kibanaUrl);
    Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const response = await request(url, {
      method,
      headers: {
        ...HEADERS,
        ...cookieHeader,
        'content-type': 'application/json',
        ...(version ? { 'elastic-api-version': version } : {}),
      },
      ...(body ? { body } : {}),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new AdminSessionRequestError(
        `[${method} ${path}] ${response.status}: ${text}`,
        response.status
      );
    }
    return (text ? JSON.parse(text) : undefined) as T;
  };
