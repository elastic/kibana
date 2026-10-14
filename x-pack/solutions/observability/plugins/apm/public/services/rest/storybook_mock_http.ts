/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIEndpoint } from '../../../server';
import type { APIClientRequestParamsOf, APIReturnType } from './create_call_apm_api';

type MockResponseFn = (params: any) => any;

interface MockEntry {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  fn: MockResponseFn;
}

const mockRegistry: MockEntry[] = [];

function endpointToMatcher(endpoint: string) {
  const spaceIdx = endpoint.indexOf(' ');
  const method = endpoint.slice(0, spaceIdx).toLowerCase();
  const path = endpoint.slice(spaceIdx + 1);
  const paramNames: string[] = [];
  const regexStr = path.replace(/\{([^}]+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return { method, pattern: new RegExp(`^${regexStr}$`), paramNames };
}

function handleRequest(method: string, pathname: string, options?: any): Promise<any> {
  for (const entry of mockRegistry) {
    if (entry.method !== method) continue;
    const match = pathname.match(entry.pattern);
    if (match) {
      const path: Record<string, string> = {};
      entry.paramNames.forEach((name, i) => {
        path[name] = match[i + 1];
      });
      const result = entry.fn({ params: { path, query: options?.query, body: options?.body } });
      // eslint-disable-next-line no-console
      console.debug('[storybook-mock-http]', method.toUpperCase(), pathname, '→ matched');
      return Promise.resolve(result);
    }
  }
  // eslint-disable-next-line no-console
  console.warn('[storybook-mock-http]', method.toUpperCase(), pathname, '→ no mock registered');
  return Promise.reject(
    new Error(`[storybook-mock-http] No mock registered for ${method.toUpperCase()} ${pathname}`)
  );
}

export const storybookMockHttp = {
  basePath: {
    prepend: (path: string) => `/basepath${path}`,
    get: () => '/basepath',
  },
  get: (pathname: string, options?: any) => handleRequest('get', pathname, options),
  post: (pathname: string, options?: any) => handleRequest('post', pathname, options),
  put: (pathname: string, options?: any) => handleRequest('put', pathname, options),
  delete: (pathname: string, options?: any) => handleRequest('delete', pathname, options),
  patch: (pathname: string, options?: any) => handleRequest('patch', pathname, options),
};

export type MockApmApiCall = <TEndpoint extends APIEndpoint>(
  endpoint: TEndpoint,
  fn: (params: APIClientRequestParamsOf<TEndpoint>) => APIReturnType<TEndpoint>
) => void;

export const mockApmApiCallResponse: MockApmApiCall = (endpoint, fn) => {
  const { method, pattern, paramNames } = endpointToMatcher(endpoint);
  const existingIdx = mockRegistry.findIndex(
    (e) => e.pattern.source === pattern.source && e.method === method
  );
  if (existingIdx >= 0) {
    mockRegistry[existingIdx] = { method, pattern, paramNames, fn };
  } else {
    mockRegistry.push({ method, pattern, paramNames, fn });
  }
};

export function clearMockResponses() {
  mockRegistry.length = 0;
}
